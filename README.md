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
- **Frontend:** React.js 18.2.0, Vite 5.2.0, React Router 7.9.4, Tailwind CSS 3.4.18, jsPDF
3.0.3.
- **Backend:** Node.js, Express.js 4.19.2, better-sqlite3 9.6.0, CORS 2.8.5.
- **Machine Learning:** Python 3.9.6, scikit-learn 1.4.2, pandas 2.2.2, numpy 1.26.4, joblib
1.4.2, PyTorch (for TabTransformer implementation).

## Model Details
- Preprocessing: median imputation and standardization  
- Train/test split: 80/20 (stratified)  
- Evaluation metric: ROC-AUC  
- Final model: Random Forest  

## Disclaimer
This project is for educational purposes only and is not a medical diagnostic tool.
