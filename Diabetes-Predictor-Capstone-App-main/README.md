# Type 2 Diabetes Risk Predictor

A machine learning web application that predicts the risk of Type 2 diabetes using basic health information.

## Overview
- Trained on the Pima Indians Diabetes dataset  
- Models compared: Logistic Regression, SVM, Random Forest, TabTransformer  
- Random Forest selected as the final model based on highest ROC-AUC  
- Deployed as a React + Node.js + Python web application  

## Features
- Probability-based diabetes risk prediction  
- Uses simple health inputs (age, glucose, BMI, blood pressure, etc.)  
- Displays risk level and prediction history  
- Includes educational diabetes information  

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS  
- **Backend:** Node.js, Express, SQLite  
- **Machine Learning:** Python, scikit-learn, PyTorch  

## Model Details
- Preprocessing: median imputation and standardization  
- Train/test split: 80/20 (stratified)  
- Evaluation metric: ROC-AUC  
- Final model: Random Forest  

## Disclaimer
This project is for educational purposes only and is not a medical diagnostic tool.
