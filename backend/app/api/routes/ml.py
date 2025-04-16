from fastapi import APIRouter, HTTPException, status, Depends, Query, Form, File, UploadFile, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.user import User
from app.services.machine_learning import MachineLearningService

router = APIRouter(
    prefix="/ml",
    tags=["machine learning"],
    responses={404: {"description": "Not found"}},
)

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models():
    """
    Retrieve all ML models.
    """
    try:
        models = MachineLearningService.get_models()
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving models: {str(e)}")

@router.get("/models/{model_id}", response_model=Dict[str, Any])
async def get_model(model_id: str):
    """
    Retrieve a specific ML model by ID.
    """
    try:
        model = MachineLearningService.get_model(model_id)
        return model
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving model: {str(e)}")

@router.post("/prepare-data", response_model=Dict[str, Any])
async def prepare_data(
    dataset_id: int = Form(...),
    target_column: str = Form(...),
    feature_columns: Optional[List[str]] = Form(None),
    network_metrics: Optional[List[str]] = Form(None),
    network_id: Optional[int] = Form(None),
    test_size: float = Form(0.2),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Prepare data for machine learning, including feature engineering.
    """
    try:
        prepared_data = await MachineLearningService.prepare_data(
            db=db,
            dataset_id=dataset_id,
            target_column=target_column,
            feature_columns=feature_columns,
            network_metrics=network_metrics,
            network_id=network_id,
            test_size=test_size
        )
        
        return prepared_data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing data: {str(e)}")

@router.post("/models", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_model(
    prepared_data: Dict[str, Any] = Body(...),
    algorithm: str = Form(...),
    hyperparameters: str = Form(...),  # JSON string of hyperparameters
    model_name: str = Form(...),
    cross_validation: int = Form(5)
):
    """
    Train a new ML model using prepared data.
    """
    try:
        # Parse hyperparameters JSON
        try:
            hyperparams = json.loads(hyperparameters)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid hyperparameters JSON")
        
        # Train model
        model_metadata = MachineLearningService.train_model(
            prepared_data=prepared_data,
            algorithm=algorithm,
            hyperparameters=hyperparams,
            cross_validation=cross_validation,
            model_name=model_name
        )
        
        return model_metadata
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: str):
    """
    Delete an ML model.
    """
    try:
        MachineLearningService.delete_model(model_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")

@router.post("/models/{model_id}/predict", response_model=Dict[str, Any])
async def predict(model_id: str, input_data: List[Dict[str, Any]]):
    """
    Make predictions using a trained model.
    """
    try:
        predictions = MachineLearningService.predict(model_id, input_data)
        return predictions
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making predictions: {str(e)}")

@router.get("/models/{model_id}/feature-importance", response_model=Dict[str, Any])
async def get_feature_importance(model_id: str):
    """
    Get feature importance for a trained model.
    """
    try:
        importances = MachineLearningService.get_feature_importances(model_id)
        return importances
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting feature importance: {str(e)}")

@router.post("/models/{model_id}/shap", response_model=Dict[str, Any])
async def generate_shap_values(model_id: str, num_samples: int = 100):
    """
    Generate SHAP values for model explanation.
    """
    try:
        shap_values = MachineLearningService.generate_shap_values(model_id, num_samples)
        return shap_values
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating SHAP values: {str(e)}")

@router.get("/algorithms", response_model=List[Dict[str, Any]])
async def get_algorithms(problem_type: Optional[str] = None):
    """
    Get available ML algorithms.
    """
    try:
        algorithms = MachineLearningService.get_available_algorithms(problem_type)
        return algorithms
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving algorithms: {str(e)}")

@router.post("/evaluate-network-features", response_model=Dict[str, Any])
async def evaluate_network_features(
    network_id: int,
    dataset_id: int,
    target_column: str,
    top_k: int = 5,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Evaluate the predictive power of network features for a given target.
    """
    try:
        # This would be a real implementation that:
        # 1. Loads the network and calculates various metrics
        # 2. Combines network metrics with the dataset
        # 3. Trains a model using the combined data
        # 4. Evaluates the importance of network features compared to regular features
        
        # For now, we'll return a placeholder
        return {
            "network_id": network_id,
            "dataset_id": dataset_id,
            "target_column": target_column,
            "message": "Network feature evaluation is not fully implemented",
            "top_features": [
                {"name": "betweenness_centrality", "importance": 0.25, "is_network_metric": True},
                {"name": "degree_centrality", "importance": 0.18, "is_network_metric": True},
                {"name": "experience_years", "importance": 0.15, "is_network_metric": False},
                {"name": "clustering_coefficient", "importance": 0.12, "is_network_metric": True},
                {"name": "education_level", "importance": 0.10, "is_network_metric": False}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating network features: {str(e)}")