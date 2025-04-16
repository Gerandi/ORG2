import pandas as pd
import numpy as np
import networkx as nx
import json
import os
import joblib
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
import uuid
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC, SVR
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    mean_squared_error, mean_absolute_error, r2_score, 
    roc_auc_score, confusion_matrix
)
import shap
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.services.network_analysis import NetworkAnalysisService
from app.models.dataset import Dataset

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create models directory if it doesn't exist
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

class MachineLearningService:
    """Service for machine learning model training and prediction."""
    
    @staticmethod
    async def prepare_data(
        db: AsyncSession,
        dataset_id: int,
        target_column: str,
        feature_columns: List[str] = None,
        network_metrics: List[str] = None,
        network_id: Optional[int] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, Any]:
        """
        Prepare data for machine learning, including feature engineering with network metrics.
        
        Args:
            db: Database session
            dataset_id: ID of the primary dataset to use
            target_column: Name of the target column
            feature_columns: List of columns to use as features
            network_metrics: List of network metrics to include as features
            network_id: ID of the network to get metrics from
            test_size: Proportion of data to use for testing
            random_state: Random seed for reproducibility
            
        Returns:
            Dictionary containing prepared X_train, X_test, y_train, y_test, and feature info
        """
        from app.services.data_service import DataService
        
        # Get dataset
        dataset = await DataService.get_dataset(db, dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        # Determine which file to use
        file_path = dataset.anonymized_file_path or dataset.processed_file_path or dataset.file_path
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Dataset file not found")
            
        # Load the dataset
        try:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_path)
            elif file_path.endswith(".json"):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                else:
                    df = pd.DataFrame([data])
            else:
                raise ValueError(f"Unsupported file format: {file_path}")
                
            # Check if target column exists
            if target_column not in df.columns:
                raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in dataset")
                
            # If feature columns not specified, use all columns except target
            if not feature_columns:
                feature_columns = [col for col in df.columns if col != target_column]
            else:
                # Verify all feature columns exist
                missing_cols = [col for col in feature_columns if col not in df.columns]
                if missing_cols:
                    raise HTTPException(status_code=400, detail=f"Feature columns not found: {', '.join(missing_cols)}")
                    
            # Get network metrics if requested
            network_features_df = None
            if network_id and network_metrics:
                # This would normally fetch from the database
                # For now, we'll load from file if available
                try:
                    # This is a placeholder - in a real implementation, this would:
                    # 1. Load the network
                    # 2. Calculate the metrics
                    # 3. Join with the original dataframe by node ID
                    
                    # Assuming df has an 'id' column that matches network node IDs
                    if 'id' not in df.columns:
                        raise HTTPException(status_code=400, detail="Dataset must have 'id' column to join with network data")
                        
                    # For this simplified implementation, we'll create mock network features
                    # In a real implementation, this would retrieve actual network metrics
                    unique_ids = df['id'].unique()
                    
                    # Create mock network metrics dataframe
                    mock_metrics = {}
                    for metric in network_metrics:
                        # Generate random values as placeholders
                        mock_metrics[f"network_{metric}"] = {str(id_val): np.random.random() for id_val in unique_ids}
                        
                    # Convert to dataframe
                    network_features = []
                    for id_val in unique_ids:
                        row = {'id': id_val}
                        for metric in network_metrics:
                            row[f"network_{metric}"] = mock_metrics[f"network_{metric}"][str(id_val)]
                        network_features.append(row)
                        
                    network_features_df = pd.DataFrame(network_features)
                    
                    # Join with main dataframe
                    df = pd.merge(df, network_features_df, on='id', how='inner')
                    
                    # Add network metrics to feature columns
                    for metric in network_metrics:
                        feature_columns.append(f"network_{metric}")
                        
                except Exception as e:
                    logger.error(f"Error incorporating network metrics: {e}")
                    raise HTTPException(status_code=500, detail=f"Error incorporating network metrics: {str(e)}")
                
            # Extract features and target
            X = df[feature_columns]
            y = df[target_column]
            
            # Identify column types
            num_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
            cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state
            )
            
            # Feature engineering report
            feature_info = {
                "numeric_features": num_cols,
                "categorical_features": cat_cols,
                "target_column": target_column,
                "target_type": str(y.dtype),
                "is_classification": y.dtype == 'object' or y.dtype == 'bool' or (y.dtype == 'int64' and y.nunique() < 10),
                "train_size": len(X_train),
                "test_size": len(X_test),
                "class_distribution": y.value_counts().to_dict() if y.dtype == 'object' or y.dtype == 'bool' or (y.dtype == 'int64' and y.nunique() < 10) else None,
                "network_metrics_included": network_metrics if network_metrics else []
            }
            
            # Remove non-numeric columns from network_features_df for correlation calculation
            if network_features_df is not None:
                network_features_num = network_features_df.select_dtypes(include=['int64', 'float64'])
                if not network_features_num.empty:
                    # Calculate correlation of network features with target (if numeric)
                    if y.dtype == 'float64' or y.dtype == 'int64':
                        # Join with target for correlation
                        corr_df = pd.merge(network_features_df, df[[target_column]], on='id', how='inner')
                        
                        # Calculate correlations
                        network_correlations = {}
                        for col in network_features_num.columns:
                            if col != 'id':
                                correlation = corr_df[col].corr(corr_df[target_column])
                                network_correlations[col] = correlation
                                
                        feature_info["network_feature_correlations"] = network_correlations
            
            # Convert X_train, X_test to JSON serializable format
            X_train_dict = X_train.to_dict(orient='records')
            X_test_dict = X_test.to_dict(orient='records')
            
            # Convert y_train, y_test to lists
            y_train_list = y_train.tolist()
            y_test_list = y_test.tolist()
            
            result = {
                "X_train": X_train_dict,
                "X_test": X_test_dict,
                "y_train": y_train_list,
                "y_test": y_test_list,
                "feature_info": feature_info,
                "feature_columns": feature_columns,
                "dataset_id": dataset_id
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error preparing data: {e}")
            raise HTTPException(status_code=500, detail=f"Error preparing data: {str(e)}")
    
    @staticmethod
    def train_model(
        prepared_data: Dict[str, Any],
        algorithm: str,
        hyperparameters: Dict[str, Any],
        cross_validation: int = 5,
        model_name: str = None
    ) -> Dict[str, Any]:
        """
        Train a machine learning model.
        
        Args:
            prepared_data: Dictionary containing prepared data from prepare_data
            algorithm: Algorithm to use ('random_forest', 'linear_regression', etc.)
            hyperparameters: Dictionary of hyperparameters for the algorithm
            cross_validation: Number of folds for cross-validation
            model_name: Name for the model
            
        Returns:
            Dictionary containing model information, metrics, and path to saved model
        """
        try:
            # Convert prepared data back to pandas
            X_train = pd.DataFrame(prepared_data["X_train"])
            X_test = pd.DataFrame(prepared_data["X_test"])
            y_train = np.array(prepared_data["y_train"])
            y_test = np.array(prepared_data["y_test"])
            feature_info = prepared_data["feature_info"]
            feature_columns = prepared_data["feature_columns"]
            
            # Determine problem type
            is_classification = feature_info["is_classification"]
            
            # Get numeric and categorical feature columns
            num_cols = feature_info["numeric_features"]
            cat_cols = feature_info["categorical_features"]
            
            # Create preprocessing pipeline
            numeric_transformer = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ])
            
            categorical_transformer = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
                ('onehot', OneHotEncoder(handle_unknown='ignore'))
            ])
            
            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', numeric_transformer, num_cols),
                    ('cat', categorical_transformer, cat_cols)
                ],
                remainder='drop'
            )
            
            # Select algorithm
            if is_classification:
                if algorithm == 'random_forest':
                    estimator = RandomForestClassifier(random_state=42, **hyperparameters)
                elif algorithm == 'logistic_regression':
                    estimator = LogisticRegression(random_state=42, max_iter=1000, **hyperparameters)
                elif algorithm == 'svm':
                    estimator = SVC(random_state=42, probability=True, **hyperparameters)
                elif algorithm == 'neural_network':
                    estimator = MLPClassifier(random_state=42, max_iter=1000, **hyperparameters)
                else:
                    raise ValueError(f"Unsupported classification algorithm: {algorithm}")
            else:
                if algorithm == 'random_forest':
                    estimator = RandomForestRegressor(random_state=42, **hyperparameters)
                elif algorithm == 'linear_regression':
                    estimator = LinearRegression(**hyperparameters)
                elif algorithm == 'svm':
                    estimator = SVR(**hyperparameters)
                elif algorithm == 'neural_network':
                    estimator = MLPRegressor(random_state=42, max_iter=1000, **hyperparameters)
                else:
                    raise ValueError(f"Unsupported regression algorithm: {algorithm}")
            
            # Create full pipeline
            model = Pipeline(steps=[
                ('preprocessor', preprocessor),
                ('estimator', estimator)
            ])
            
            # Train the model
            model.fit(X_train, y_train)
            
            # Run cross-validation
            cv_scores = cross_val_score(model, X_train, y_train, cv=cross_validation)
            
            # Make predictions on test set
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            metrics = {}
            if is_classification:
                # Check if the estimator supports predict_proba
                if hasattr(model, 'predict_proba'):
                    y_prob = model.predict_proba(X_test)
                    
                    # If binary classification
                    if len(set(y_train)) == 2:
                        metrics['roc_auc'] = roc_auc_score(y_test, y_prob[:, 1])
                
                metrics['accuracy'] = accuracy_score(y_test, y_pred)
                
                # For multi-class, use 'weighted' average
                avg_strategy = 'weighted' if len(set(y_train)) > 2 else 'binary'
                
                metrics['precision'] = precision_score(y_test, y_pred, average=avg_strategy, zero_division=0)
                metrics['recall'] = recall_score(y_test, y_pred, average=avg_strategy, zero_division=0)
                metrics['f1'] = f1_score(y_test, y_pred, average=avg_strategy, zero_division=0)
                
                # Get confusion matrix as list of lists
                metrics['confusion_matrix'] = confusion_matrix(y_test, y_pred).tolist()
                
            else:  # Regression
                metrics['r2'] = r2_score(y_test, y_pred)
                metrics['mse'] = mean_squared_error(y_test, y_pred)
                metrics['rmse'] = np.sqrt(metrics['mse'])
                metrics['mae'] = mean_absolute_error(y_test, y_pred)
            
            # Generate unique ID for model
            model_id = str(uuid.uuid4())
            
            # Generate default name if none provided
            if not model_name:
                target_col = feature_info["target_column"]
                model_name = f"{algorithm}_{target_col}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Save model to disk
            model_dir = os.path.join(MODELS_DIR, model_id)
            os.makedirs(model_dir, exist_ok=True)
            
            model_path = os.path.join(model_dir, 'model.joblib')
            joblib.dump(model, model_path)
            
            # Calculate feature importances
            feature_importances = MachineLearningService._calculate_feature_importances(
                model, X_train, feature_columns
            )
            
            # Save feature importances
            importances_path = os.path.join(model_dir, 'feature_importances.json')
            with open(importances_path, 'w') as f:
                json.dump(feature_importances, f)
            
            # Save model metadata
            metadata = {
                "id": model_id,
                "name": model_name,
                "algorithm": algorithm,
                "hyperparameters": hyperparameters,
                "is_classification": is_classification,
                "metrics": metrics,
                "cv_scores": cv_scores.tolist(),
                "cv_mean": cv_scores.mean(),
                "cv_std": cv_scores.std(),
                "feature_columns": feature_columns,
                "target_column": feature_info["target_column"],
                "created_at": datetime.now().isoformat(),
                "dataset_id": prepared_data["dataset_id"],
                "model_path": model_path,
                "feature_importances": feature_importances
            }
            
            metadata_path = os.path.join(model_dir, 'metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f)
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")
    
    @staticmethod
    def _calculate_feature_importances(model, X_train, feature_columns) -> Dict[str, Any]:
        """
        Calculate feature importances for the model.
        
        Args:
            model: Trained model pipeline
            X_train: Training data
            feature_columns: List of feature column names
            
        Returns:
            Dictionary containing feature importances and their visualization data
        """
        try:
            # Access the estimator from the pipeline
            estimator = model.named_steps['estimator']
            
            # Different approaches based on estimator type
            importances = {}
            
            # For tree-based models that have feature_importances_ attribute
            if hasattr(estimator, 'feature_importances_'):
                # Get feature names after preprocessing
                preprocessor = model.named_steps['preprocessor']
                cat_cols = preprocessor.transformers_[1][2]  # Categorical columns
                
                # Get feature names after one-hot encoding
                feature_names = []
                for i, col in enumerate(preprocessor.transformers_):
                    transformer_name, transformer, column_names = col
                    if transformer_name == 'num':
                        feature_names.extend(column_names)
                    elif transformer_name == 'cat':
                        encoder = transformer.named_steps['onehot']
                        # This is oversimplified - in reality you'd need to apply the encoder
                        for cat_col in column_names:
                            unique_values = X_train[cat_col].dropna().unique()
                            for val in unique_values:
                                feature_names.append(f"{cat_col}_{val}")
                
                # Adjust feature_names length to match feature_importances_ length if needed
                if len(feature_names) != len(estimator.feature_importances_):
                    # This is a simplification - might need more complex logic in practice
                    feature_names = [f"feature_{i}" for i in range(len(estimator.feature_importances_))]
                
                # Get feature importances
                raw_importances = estimator.feature_importances_
                importances_dict = dict(zip(feature_names, raw_importances))
                
                # Sort by importance
                sorted_importances = sorted(
                    importances_dict.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )
                
                # Prepare importances in sorted order
                importances["method"] = "feature_importances_"
                importances["importances"] = [
                    {"feature": feature, "importance": float(importance)}
                    for feature, importance in sorted_importances
                ]
                
            # For linear models that have coef_ attribute
            elif hasattr(estimator, 'coef_'):
                # Similar logic as above, but using absolute coefficient values
                preprocessor = model.named_steps['preprocessor']
                
                # Get feature names (simplified version)
                feature_names = []
                for i, col in enumerate(preprocessor.transformers_):
                    transformer_name, transformer, column_names = col
                    if transformer_name == 'num':
                        feature_names.extend(column_names)
                    elif transformer_name == 'cat':
                        # Simplified - in practice, you'd do more to handle one-hot encoding
                        for cat_col in column_names:
                            unique_values = X_train[cat_col].dropna().unique()
                            for val in unique_values:
                                feature_names.append(f"{cat_col}_{val}")
                
                # Use absolute coefficients as importance measure
                if estimator.coef_.ndim > 1:
                    # For multi-class, use mean absolute value across classes
                    raw_importances = np.mean(np.abs(estimator.coef_), axis=0)
                else:
                    raw_importances = np.abs(estimator.coef_)
                
                # Adjust feature_names length if needed
                if len(feature_names) != len(raw_importances):
                    feature_names = [f"feature_{i}" for i in range(len(raw_importances))]
                
                # Create and sort importances
                importances_dict = dict(zip(feature_names, raw_importances))
                sorted_importances = sorted(
                    importances_dict.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )
                
                # Prepare importances in sorted order
                importances["method"] = "coefficient_magnitude"
                importances["importances"] = [
                    {"feature": feature, "importance": float(importance)}
                    for feature, importance in sorted_importances
                ]
                
            # If model doesn't have built-in importance, use SHAP values
            else:
                importances["method"] = "none"
                importances["importances"] = []
                
                # Note: A real implementation would calculate SHAP values here
                # This is computationally expensive and depends on model type
                
            return importances
            
        except Exception as e:
            logger.error(f"Error calculating feature importances: {e}")
            # Return empty importances rather than failing
            return {"method": "error", "importances": [], "error": str(e)}
    
    @staticmethod
    def predict(model_id: str, input_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Make predictions using a trained model.
        
        Args:
            model_id: ID of the model to use
            input_data: List of input data points as dictionaries
            
        Returns:
            Dictionary containing predictions
        """
        try:
            # Load model
            model_dir = os.path.join(MODELS_DIR, model_id)
            
            if not os.path.exists(model_dir):
                raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
                
            metadata_path = os.path.join(model_dir, 'metadata.json')
            model_path = os.path.join(model_dir, 'model.joblib')
            
            # Check paths exist
            if not os.path.exists(metadata_path) or not os.path.exists(model_path):
                raise HTTPException(status_code=404, detail=f"Model files for {model_id} not found")
                
            # Load metadata and model
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                
            model = joblib.load(model_path)
            
            # Prepare input data
            input_df = pd.DataFrame(input_data)
            
            # Check required columns
            required_columns = metadata["feature_columns"]
            missing_columns = [col for col in required_columns if col not in input_df.columns]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Input data missing required columns: {', '.join(missing_columns)}"
                )
                
            # Make predictions
            predictions = model.predict(input_df[required_columns])
            
            # Add probabilities for classification models
            probabilities = None
            if metadata["is_classification"] and hasattr(model, "predict_proba"):
                probabilities = model.predict_proba(input_df[required_columns]).tolist()
                
            # Format results
            results = []
            for i, (row, pred) in enumerate(zip(input_data, predictions)):
                result = {"input_id": i, "prediction": pred.item() if isinstance(pred, np.ndarray) else pred}
                
                # Add probabilities if available
                if probabilities:
                    result["probabilities"] = probabilities[i]
                    
                    # For binary classification, add probability of positive class
                    if len(probabilities[i]) == 2:
                        result["probability"] = probabilities[i][1]
                        
                results.append(result)
                
            return {
                "model_id": model_id,
                "model_name": metadata["name"],
                "is_classification": metadata["is_classification"],
                "target_column": metadata["target_column"],
                "predictions": results
            }
            
        except Exception as e:
            logger.error(f"Error making predictions: {e}")
            raise HTTPException(status_code=500, detail=f"Error making predictions: {str(e)}")
    
    @staticmethod
    def get_available_algorithms(problem_type: str = None) -> List[Dict[str, Any]]:
        """
        Get available machine learning algorithms.
        
        Args:
            problem_type: Optional filter for problem type ('classification' or 'regression')
            
        Returns:
            List of available algorithms with their parameters
        """
        # Define classification algorithms
        classification_algorithms = [
            {
                "id": "random_forest",
                "name": "Random Forest",
                "type": "classification",
                "description": "Ensemble learning method that fits multiple decision trees and uses averaging to improve predictive accuracy and control over-fitting.",
                "parameters": [
                    {"name": "n_estimators", "type": "int", "default": 100, "min": 10, "max": 1000, "description": "The number of trees in the forest."},
                    {"name": "max_depth", "type": "int", "default": None, "min": 1, "max": 100, "description": "The maximum depth of the tree."},
                    {"name": "min_samples_split", "type": "int", "default": 2, "min": 2, "max": 20, "description": "The minimum number of samples required to split an internal node."},
                    {"name": "min_samples_leaf", "type": "int", "default": 1, "min": 1, "max": 20, "description": "The minimum number of samples required to be at a leaf node."},
                    {"name": "max_features", "type": "string", "default": "sqrt", "options": ["auto", "sqrt", "log2"], "description": "The number of features to consider when looking for the best split."}
                ]
            },
            {
                "id": "logistic_regression",
                "name": "Logistic Regression",
                "type": "classification",
                "description": "A linear model for classification where the probabilities describing the possible outcomes of a single trial are modeled using a logistic function.",
                "parameters": [
                    {"name": "C", "type": "float", "default": 1.0, "min": 0.001, "max": 1000.0, "description": "Inverse of regularization strength; smaller values specify stronger regularization."},
                    {"name": "penalty", "type": "string", "default": "l2", "options": ["l1", "l2", "elasticnet", "none"], "description": "Used to specify the norm used in the penalization."},
                    {"name": "solver", "type": "string", "default": "lbfgs", "options": ["newton-cg", "lbfgs", "liblinear", "sag", "saga"], "description": "Algorithm to use in the optimization problem."},
                    {"name": "max_iter", "type": "int", "default": 100, "min": 100, "max": 10000, "description": "Maximum number of iterations for solvers to converge."}
                ]
            },
            {
                "id": "svm",
                "name": "Support Vector Machine",
                "type": "classification",
                "description": "Support Vector Machine. Maps training examples to points in space so as to maximize the width of the gap between the two categories.",
                "parameters": [
                    {"name": "C", "type": "float", "default": 1.0, "min": 0.001, "max": 1000.0, "description": "Regularization parameter. The strength of the regularization is inversely proportional to C."},
                    {"name": "kernel", "type": "string", "default": "rbf", "options": ["linear", "poly", "rbf", "sigmoid"], "description": "Specifies the kernel type to be used in the algorithm."},
                    {"name": "gamma", "type": "string", "default": "scale", "options": ["scale", "auto"], "description": "Kernel coefficient for 'rbf', 'poly' and 'sigmoid'."}
                ]
            },
            {
                "id": "neural_network",
                "name": "Neural Network",
                "type": "classification",
                "description": "Multi-layer Perceptron classifier. Trains using Backpropagation with optimization methods like SGD or Adam.",
                "parameters": [
                    {"name": "hidden_layer_sizes", "type": "tuple", "default": [100], "description": "The ith element represents the number of neurons in the ith hidden layer."},
                    {"name": "activation", "type": "string", "default": "relu", "options": ["identity", "logistic", "tanh", "relu"], "description": "Activation function for the hidden layer."},
                    {"name": "solver", "type": "string", "default": "adam", "options": ["lbfgs", "sgd", "adam"], "description": "The solver for weight optimization."},
                    {"name": "alpha", "type": "float", "default": 0.0001, "min": 0.00000001, "max": 1.0, "description": "L2 penalty (regularization term) parameter."},
                    {"name": "max_iter", "type": "int", "default": 200, "min": 100, "max": 10000, "description": "Maximum number of iterations."}
                ]
            }
        ]
        
        # Define regression algorithms
        regression_algorithms = [
            {
                "id": "random_forest",
                "name": "Random Forest",
                "type": "regression",
                "description": "Ensemble learning method that fits multiple decision trees and uses averaging to improve predictive accuracy and control over-fitting.",
                "parameters": [
                    {"name": "n_estimators", "type": "int", "default": 100, "min": 10, "max": 1000, "description": "The number of trees in the forest."},
                    {"name": "max_depth", "type": "int", "default": None, "min": 1, "max": 100, "description": "The maximum depth of the tree."},
                    {"name": "min_samples_split", "type": "int", "default": 2, "min": 2, "max": 20, "description": "The minimum number of samples required to split an internal node."},
                    {"name": "min_samples_leaf", "type": "int", "default": 1, "min": 1, "max": 20, "description": "The minimum number of samples required to be at a leaf node."},
                    {"name": "max_features", "type": "string", "default": "sqrt", "options": ["auto", "sqrt", "log2"], "description": "The number of features to consider when looking for the best split."}
                ]
            },
            {
                "id": "linear_regression",
                "name": "Linear Regression",
                "type": "regression",
                "description": "Linear approach for modeling the relationship between a dependent variable and one or more independent variables.",
                "parameters": [
                    {"name": "fit_intercept", "type": "boolean", "default": True, "description": "Whether to calculate the intercept for this model."},
                    {"name": "normalize", "type": "boolean", "default": False, "description": "If True, the regressors X will be normalized before regression."}
                ]
            },
            {
                "id": "svm",
                "name": "Support Vector Machine",
                "type": "regression",
                "description": "Support Vector Regression. Maps training examples to points in space to predict continuous values.",
                "parameters": [
                    {"name": "C", "type": "float", "default": 1.0, "min": 0.001, "max": 1000.0, "description": "Regularization parameter. The strength of the regularization is inversely proportional to C."},
                    {"name": "kernel", "type": "string", "default": "rbf", "options": ["linear", "poly", "rbf", "sigmoid"], "description": "Specifies the kernel type to be used in the algorithm."},
                    {"name": "gamma", "type": "string", "default": "scale", "options": ["scale", "auto"], "description": "Kernel coefficient for 'rbf', 'poly' and 'sigmoid'."}
                ]
            },
            {
                "id": "neural_network",
                "name": "Neural Network",
                "type": "regression",
                "description": "Multi-layer Perceptron regressor. Trains using Backpropagation with optimization methods like SGD or Adam.",
                "parameters": [
                    {"name": "hidden_layer_sizes", "type": "tuple", "default": [100], "description": "The ith element represents the number of neurons in the ith hidden layer."},
                    {"name": "activation", "type": "string", "default": "relu", "options": ["identity", "logistic", "tanh", "relu"], "description": "Activation function for the hidden layer."},
                    {"name": "solver", "type": "string", "default": "adam", "options": ["lbfgs", "sgd", "adam"], "description": "The solver for weight optimization."},
                    {"name": "alpha", "type": "float", "default": 0.0001, "min": 0.00000001, "max": 1.0, "description": "L2 penalty (regularization term) parameter."},
                    {"name": "max_iter", "type": "int", "default": 200, "min": 100, "max": 10000, "description": "Maximum number of iterations."}
                ]
            }
        ]
        
        # Filter by problem type if specified
        if problem_type == "classification":
            return classification_algorithms
        elif problem_type == "regression":
            return regression_algorithms
        else:
            # Return all algorithms
            return classification_algorithms + regression_algorithms
    
    @staticmethod
    def get_models() -> List[Dict[str, Any]]:
        """
        Get all available models.
        
        Returns:
            List of model metadata
        """
        try:
            models = []
            
            # Iterate through model directories
            for model_id in os.listdir(MODELS_DIR):
                model_dir = os.path.join(MODELS_DIR, model_id)
                
                # Skip if not a directory
                if not os.path.isdir(model_dir):
                    continue
                    
                # Load metadata
                metadata_path = os.path.join(model_dir, 'metadata.json')
                
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        
                    # Include only key information for the list view
                    models.append({
                        "id": metadata["id"],
                        "name": metadata["name"],
                        "algorithm": metadata["algorithm"],
                        "is_classification": metadata["is_classification"],
                        "target_column": metadata["target_column"],
                        "created_at": metadata["created_at"],
                        "dataset_id": metadata.get("dataset_id"),
                        "metrics": metadata["metrics"],
                        "cv_mean": metadata["cv_mean"],
                        "cv_std": metadata["cv_std"]
                    })
                    
            return models
            
        except Exception as e:
            logger.error(f"Error getting models: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting models: {str(e)}")
    
    @staticmethod
    def get_model(model_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            Model metadata
        """
        try:
            model_dir = os.path.join(MODELS_DIR, model_id)
            
            if not os.path.exists(model_dir):
                raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
                
            metadata_path = os.path.join(model_dir, 'metadata.json')
            
            if not os.path.exists(metadata_path):
                raise HTTPException(status_code=404, detail=f"Metadata for model {model_id} not found")
                
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                
            # Remove file paths for security
            if "model_path" in metadata:
                del metadata["model_path"]
                
            return metadata
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error getting model details: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting model details: {str(e)}")
    
    @staticmethod
    def delete_model(model_id: str) -> bool:
        """
        Delete a model.
        
        Args:
            model_id: ID of the model to delete
            
        Returns:
            True if successful
        """
        try:
            model_dir = os.path.join(MODELS_DIR, model_id)
            
            if not os.path.exists(model_dir):
                raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
                
            # Delete all files in directory
            for filename in os.listdir(model_dir):
                file_path = os.path.join(model_dir, filename)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                    
            # Remove directory
            os.rmdir(model_dir)
            
            return True
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error deleting model: {e}")
            raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")
    
    @staticmethod
    def get_feature_importances(model_id: str) -> Dict[str, Any]:
        """
        Get feature importances for a model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            Feature importances
        """
        try:
            model_dir = os.path.join(MODELS_DIR, model_id)
            
            if not os.path.exists(model_dir):
                raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
                
            importances_path = os.path.join(model_dir, 'feature_importances.json')
            
            if not os.path.exists(importances_path):
                # Get model metadata to check if it exists
                metadata_path = os.path.join(model_dir, 'metadata.json')
                
                if os.path.exists(metadata_path):
                    # Model exists but no importances file
                    # This can happen if importances calculation failed or wasn't saved
                    return {
                        "model_id": model_id,
                        "method": "not_available",
                        "importances": []
                    }
                else:
                    raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
                    
            with open(importances_path, 'r') as f:
                importances = json.load(f)
                
            # Add model_id to response
            importances["model_id"] = model_id
            
            return importances
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Error getting feature importances: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting feature importances: {str(e)}")
    
    @staticmethod
    def generate_shap_values(model_id: str, num_samples: int = 100) -> Dict[str, Any]:
        """
        Generate SHAP values for model explanation.
        
        Args:
            model_id: ID of the model
            num_samples: Number of samples to use for SHAP calculation
            
        Returns:
            SHAP values and visualization data
        """
        try:
            # This would be a real implementation that:
            # 1. Loads the model
            # 2. Takes a sample of the training data
            # 3. Calculates SHAP values
            # 4. Returns the values in a format suitable for visualization
            
            # For now, we'll return a placeholder
            return {
                "model_id": model_id,
                "message": "SHAP value calculation is not implemented in this simplified version",
                "shap_values": []
            }
            
        except Exception as e:
            logger.error(f"Error generating SHAP values: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating SHAP values: {str(e)}")