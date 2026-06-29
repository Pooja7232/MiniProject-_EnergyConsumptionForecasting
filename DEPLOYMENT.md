# Deployment Guide - Energy Consumption Forecasting

This guide explains how to deploy your Flask and Machine Learning application to a cloud hosting platform. We recommend using **Render** as it is free, extremely easy to set up, and supports Python web applications natively.

---

## 1. Prepare the Application for Production

Before deploying, we need to make a few minor adjustments to ensure the app runs securely and efficiently in a production environment.

### A. Install Gunicorn (Production WSGI Server)
Flask's built-in server (`app.run()`) is only meant for local development. In production, we use **Gunicorn** (Green Unicorn).
We have added `gunicorn` to the `requirements.txt` file.

### B. Ensure Environment Variables are Used
Your application already loads configuration from `.env` using `python-dotenv`. In production, you will input these environment variables directly into the hosting platform's dashboard instead of uploading a `.env` file (which should be kept private and not pushed to GitHub).

---

## 2. Step-by-Step Deployment on Render (Recommended)

### Step 1: Push Your Code to GitHub
1. Initialize a Git repository in your project folder:
   ```bash
   git init
   ```
2. Create a `.gitignore` file to avoid uploading unnecessary files:
   ```text
   __pycache__/
   *.pyc
   .env
   .venv/
   *.joblib
   recent_data.json
   forecast_data.json
   metrics.json
   feature_importances.json
   ```
   *(Note: You can choose to train the models locally and push the `.joblib` and `.json` files to GitHub so the server doesn't have to train them on startup. If you do this, remove `*.joblib` and `*.json` from your `.gitignore` before committing).*

3. Commit and push your code to a new **GitHub** repository:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/energy-consumption-forecasting.git
   git push -u origin main
   ```

### Step 2: Create a Render Account
1. Go to **[Render.com](https://render.com/)** and sign up (you can log in instantly using your GitHub account).

### Step 3: Create a New Web Service
1. In the Render Dashboard, click the **New +** button and select **Web Service**.
2. Connect your GitHub account and select your `energy-consumption-forecasting` repository.

### Step 4: Configure Service Settings
Fill in the following details in the configuration form:
* **Name**: `energy-forecast-dashboard` (or any name you prefer)
* **Region**: Choose the region closest to you (e.g., Oregon or Singapore)
* **Branch**: `main`
* **Runtime**: `Python`
* **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
* **Start Command**:
  ```bash
  gunicorn app:app
  ```
* **Instance Type**: Select **Free** (includes 512MB RAM, which is plenty for this app).

### Step 5: Add Environment Variables
1. Scroll down and click on **Advanced**.
2. Click **Add Environment Variable** and add the following keys from your local `.env` file:
   * `SUPABASE_URL` = `https://wkmgkzuxqeunwiygdjcv.supabase.co`
   * `SUPABASE_ANON_KEY` = `your-actual-supabase-anon-key`
   * `FLASK_SECRET_KEY` = `your-generated-flask-secret-key`

### Step 6: Deploy!
1. Click **Create Web Service**.
2. Render will download your code, install the dependencies, and start the web server. 
3. Once the build is complete, Render will provide a public URL (e.g., `https://energy-forecast-dashboard.onrender.com`) where your app is live!

---

## 3. Alternative Deployment Options

* **Railway.app**: A very fast and developer-friendly alternative to Render. It offers a similar workflow (connect GitHub, set start command to `gunicorn app:app`, add env variables).
* **PythonAnywhere**: A Python-specific hosting platform. It is free and very stable, but requires manually uploading files or cloning via Git, and configuring a Web Tab rather than automatic GitHub deployments.
