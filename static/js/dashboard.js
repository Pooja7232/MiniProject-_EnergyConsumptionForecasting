// Dashboard Visualizations and API Integrations
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the login page, if so, skip dashboard initialization
    if (window.location.pathname === '/login') return;

    // Initialize DOM elements
    initTabs();
    initSliders();
    loadDashboardData();
    setupPredictorForm();
});

// Tab Switching Logic
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');

            // Remove active classes
            navItems.forEach(i => i.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active classes
            item.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// Sliders Value Binding
function initSliders() {
    const sliders = [
        { id: 'pred-temp', valId: 'val-temp', suffix: ' °C' },
        { id: 'pred-humidity', valId: 'val-humidity', suffix: ' %' },
        { id: 'pred-solar', valId: 'val-solar', suffix: ' W/m²' },
        { id: 'pred-wind', valId: 'val-wind', suffix: ' m/s' },
        { id: 'pred-precip', valId: 'val-precip', suffix: ' mm' }
    ];

    sliders.forEach(slider => {
        const sliderEl = document.getElementById(slider.id);
        const valEl = document.getElementById(slider.valId);
        
        if (sliderEl && valEl) {
            sliderEl.addEventListener('input', (e) => {
                valEl.textContent = e.target.value + slider.suffix;
            });
        }
    });

    // Set default datetime to current local time
    const datetimeInput = document.getElementById('pred-datetime');
    if (datetimeInput) {
        const now = new Date();
        // Format to YYYY-MM-DDTHH:MM
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        datetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// Fetch and load all data from Flask API
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard_data');
        const data = await response.json();

        if (data.status === 'success') {
            updateKPICards(data.recent_data);
            updateModelMetrics(data.metrics);
            
            // Fetch forecast data and render all charts
            const forecastResponse = await fetch('/api/forecast');
            const forecastData = await forecastResponse.json();
            
            renderOverviewCharts(data.recent_data, forecastData);
            renderModelComparisonCharts(data.metrics, data.feature_importances, forecastData);
        } else {
            console.error("Failed to load dashboard data:", data.message);
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Update KPI Metrics Cards
function updateKPICards(recent) {
    if (!recent || !recent.energy_kWh) return;

    const totalEnergy = recent.energy_kWh.reduce((a, b) => a + b, 0);
    const peakDemand = Math.max(...recent.energy_kWh);
    const avgPf = recent.pf.reduce((a, b) => a + b, 0) / recent.pf.length;
    const avgTemp = recent.temperature.reduce((a, b) => a + b, 0) / recent.temperature.length;

    document.getElementById('kpi-total-energy').textContent = totalEnergy.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' kWh';
    document.getElementById('kpi-peak-demand').textContent = peakDemand.toLocaleString(undefined, {maximumFractionDigits: 2}) + ' kW';
    document.getElementById('kpi-avg-pf').textContent = avgPf.toFixed(3);
    document.getElementById('kpi-avg-temp').textContent = avgTemp.toFixed(1) + ' °C';
}

// Populate model metrics in comparison tab
function updateModelMetrics(metrics) {
    if (!metrics) return;

    // R2 Scores
    document.getElementById('r2-xgb').textContent = metrics.XGBoost.r2.toFixed(3);
    document.getElementById('r2-rf').textContent = metrics['Random Forest'].r2.toFixed(3);
    document.getElementById('r2-arima').textContent = metrics.ARIMA.r2.toFixed(3);

    // MAE Scores
    document.getElementById('mae-xgb').textContent = metrics.XGBoost.mae.toFixed(2) + ' kWh';
    document.getElementById('mae-rf').textContent = metrics['Random Forest'].mae.toFixed(2) + ' kWh';
    document.getElementById('mae-arima').textContent = metrics.ARIMA.mae.toFixed(2) + ' kWh';

    // RMSE Scores
    document.getElementById('rmse-xgb').textContent = metrics.XGBoost.rmse.toFixed(2) + ' kWh';
    document.getElementById('rmse-rf').textContent = metrics['Random Forest'].rmse.toFixed(2) + ' kWh';
    document.getElementById('rmse-arima').textContent = metrics.ARIMA.rmse.toFixed(2) + ' kWh';
}

// Renders Overview Tab Charts
function renderOverviewCharts(recent, forecast) {
    const ctxForecast = document.getElementById('forecastChart').getContext('2d');
    const ctxWeather = document.getElementById('weatherCorrelationChart').getContext('2d');
    const ctxDiurnal = document.getElementById('diurnalProfileChart').getContext('2d');

    // 1. Historical vs Forecast Chart
    const histLabels = recent.timestamps.map(t => {
        const dt = new Date(t);
        return dt.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + ' ' + dt.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});
    });
    const foreLabels = forecast.timestamps || [];
    const allLabels = [...histLabels, ...foreLabels];

    const histEnergy = [...recent.energy_kWh];
    // Pad the forecast part with nulls for the historical series
    const histSeries = [...histEnergy, ...Array(foreLabels.length).fill(null)];
    
    // Pad the historical part with nulls for the forecast series, except the last point of history to connect the lines
    const foreSeries = [...Array(histEnergy.length - 1).fill(null), histEnergy[histEnergy.length - 1], ...forecast.forecasts.XGBoost];

    // Chart.js Gradients
    const gradBlue = ctxForecast.createLinearGradient(0, 0, 0, 300);
    gradBlue.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradBlue.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const gradCyan = ctxForecast.createLinearGradient(0, 0, 0, 300);
    gradCyan.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
    gradCyan.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

    new Chart(ctxForecast, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Historical Energy',
                    data: histSeries,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    backgroundColor: gradBlue,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.3
                },
                {
                    label: 'Forecast (XGBoost)',
                    data: foreSeries,
                    borderColor: '#00f2fe',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    backgroundColor: gradCyan,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 20, 30, 0.95)',
                    titleFont: { family: 'Outfit', size: 13, weight: '600' },
                    bodyFont: { family: 'Outfit', size: 12 },
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 10 },
                        maxTicksLimit: 12
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 11 }
                    },
                    title: {
                        display: true,
                        text: 'Energy Consumption (kWh)',
                        color: '#9ca3af',
                        font: { family: 'Outfit', size: 12 }
                    }
                }
            }
        }
    });

    // 2. Weather Correlation Chart (Energy vs Temp and Solar Radiation)
    const scatterDataTemp = recent.temperature.map((t, i) => ({ x: t, y: recent.energy_kWh[i] }));
    
    new Chart(ctxWeather, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Temp vs Energy',
                data: scatterDataTemp,
                backgroundColor: 'rgba(0, 242, 254, 0.6)',
                borderColor: 'rgba(0, 242, 254, 0.8)',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 20, 30, 0.95)',
                    callbacks: {
                        label: (context) => `Temp: ${context.parsed.x}°C, Energy: ${context.parsed.y.toFixed(1)} kWh`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' },
                    title: { display: true, text: 'Temperature (°C)', color: '#9ca3af' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' },
                    title: { display: true, text: 'Energy (kWh)', color: '#9ca3af' }
                }
            }
        }
    });

    // 3. Hourly Diurnal Profile Chart
    // Calculate average energy per hour of day (0-23)
    const hourlySums = Array(24).fill(0);
    const hourlyCounts = Array(24).fill(0);
    
    recent.timestamps.forEach((t, i) => {
        const hour = new Date(t).getHours();
        hourlySums[hour] += recent.energy_kWh[i];
        hourlyCounts[hour] += 1;
    });
    
    const diurnalProfile = hourlySums.map((sum, idx) => sum / (hourlyCounts[idx] || 1));

    new Chart(ctxDiurnal, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => {
                const ampm = i >= 12 ? 'PM' : 'AM';
                const h = i % 12 || 12;
                return `${h} ${ampm}`;
            }),
            datasets: [{
                label: 'Avg Hourly Demand',
                data: diurnalProfile,
                backgroundColor: 'rgba(59, 130, 246, 0.35)',
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 9 }, maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// Renders Model Comparison Tab Charts
function renderModelComparisonCharts(metrics, importances, forecast) {
    const ctxMetrics = document.getElementById('metricsComparisonChart').getContext('2d');
    const ctxImportance = document.getElementById('featureImportanceChart').getContext('2d');
    const ctxForeComp = document.getElementById('forecastComparisonChart').getContext('2d');

    // 1. Error Metrics Chart
    new Chart(ctxMetrics, {
        type: 'bar',
        data: {
            labels: ['XGBoost', 'Random Forest', 'ARIMA'],
            datasets: [
                {
                    label: 'MAE (kWh)',
                    data: [metrics.XGBoost.mae, metrics['Random Forest'].mae, metrics.ARIMA.mae],
                    backgroundColor: 'rgba(0, 242, 254, 0.7)',
                    borderRadius: 6
                },
                {
                    label: 'RMSE (kWh)',
                    data: [metrics.XGBoost.rmse, metrics['Random Forest'].rmse, metrics.ARIMA.rmse],
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f3f4f6', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } }
            }
        }
    });

    // 2. Feature Importances Chart
    // Sort features by XGBoost importance
    const feats = [...importances.features];
    const xgbImp = [...importances.xgb];
    const rfImp = [...importances.rf];
    
    // Combine, sort, and separate
    const combined = feats.map((f, i) => ({ name: f, xgb: xgbImp[i], rf: rfImp[i] }));
    combined.sort((a, b) => b.xgb - a.xgb);

    new Chart(ctxImportance, {
        type: 'bar',
        data: {
            labels: combined.map(c => c.name.replace('_', ' ')),
            datasets: [
                {
                    label: 'XGBoost',
                    data: combined.map(c => c.xgb),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 5
                },
                {
                    label: 'Random Forest',
                    data: combined.map(c => c.rf),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderRadius: 5
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f3f4f6', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });

    // 3. 24h Forecast Comparison Chart against Actual
    const compLabels = forecast.timestamps || [];
    
    new Chart(ctxForeComp, {
        type: 'line',
        data: {
            labels: compLabels,
            datasets: [
                {
                    label: 'Actual Energy',
                    data: forecast.actual,
                    borderColor: '#f3f4f6',
                    borderWidth: 3,
                    pointRadius: 3,
                    fill: false,
                    tension: 0.25
                },
                {
                    label: 'XGBoost Forecast (Winner)',
                    data: forecast.forecasts.XGBoost,
                    borderColor: '#10b981',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.25
                },
                {
                    label: 'Random Forest Forecast',
                    data: forecast.forecasts['Random Forest'],
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.25
                },
                {
                    label: 'ARIMA Forecast',
                    data: forecast.forecasts.ARIMA,
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.25
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#f3f4f6', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    ticks: { color: '#9ca3af' },
                    title: { display: true, text: 'Energy (kWh)', color: '#9ca3af' }
                }
            }
        }
    });
}

// What-If Predictor Form Submissions
function setupPredictorForm() {
    const form = document.getElementById('predictor-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get values
        const dt = document.getElementById('pred-datetime').value;
        const temp = parseFloat(document.getElementById('pred-temp').value);
        const humidity = parseFloat(document.getElementById('pred-humidity').value);
        const solar = parseFloat(document.getElementById('pred-solar').value);
        const wind = parseFloat(document.getElementById('pred-wind').value);
        const precip = parseFloat(document.getElementById('pred-precip').value);

        // UI Feedback
        document.getElementById('pred-val-xgb').innerHTML = '<span class="text-sm">Simulating...</span>';
        document.getElementById('pred-val-rf').innerHTML = '--';
        document.getElementById('pred-val-arima').innerHTML = '--';

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    datetime: dt,
                    temperature: temp,
                    humidity: humidity,
                    solar_radiation: solar,
                    wind_speed: wind,
                    precipitation: precip
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                // Update Values
                document.getElementById('result-timestamp').textContent = `Target: ${result.datetime}`;
                document.getElementById('pred-val-xgb').innerHTML = `${result.predictions.XGBoost.toFixed(1)} <span class="unit">kWh</span>`;
                document.getElementById('pred-val-rf').innerHTML = `${result.predictions['Random Forest'].toFixed(1)} kWh`;
                document.getElementById('pred-val-arima').innerHTML = `${result.predictions.ARIMA.toFixed(1)} kWh`;

                // Update Insight
                updatePredictiveInsight(temp, solar, dt);
            } else {
                console.error("Simulation failed:", result.message);
                document.getElementById('pred-val-xgb').textContent = 'Error';
            }
        } catch (error) {
            console.error("Error running simulation:", error);
            document.getElementById('pred-val-xgb').textContent = 'Error';
        }
    });
}

// Generate dynamic textual insights based on What-If inputs
function updatePredictiveInsight(temp, solar, dtStr) {
    const insightEl = document.getElementById('predictive-insight');
    if (!insightEl) return;

    const dt = new Date(dtStr);
    const hour = dt.getHours();
    const day = dt.getDay();
    const isWeekend = day === 0 || day === 6;

    let insightText = "";

    if (temp > 30) {
        insightText += "High temperature detected. The model predicts elevated cooling loads, driving up energy demand. ";
    } else if (temp < 15) {
        insightText += "Cooler temperature detected. Heating loads may contribute to a slight increase in baseline energy. ";
    } else {
        insightText += "Moderate temperature detected. Environmental cooling/heating loads are minimal. ";
    }

    if (solar > 600 && hour >= 10 && hour <= 16) {
        insightText += "Peak solar radiation and midday hours align with high solar heat gain, which typically correlates with high cooling demand. ";
    }

    if (isWeekend) {
        insightText += "As it is a weekend, the model adjusts for residential/commercial load shifts, resulting in a lower baseline compared to weekdays.";
    } else {
        insightText += "Weekday load patterns apply. Expect typical commercial and industrial baselines during working hours.";
    }

    insightEl.textContent = insightText;
}
