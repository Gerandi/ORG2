from fastapi import APIRouter, HTTPException, status, Depends, Query, Form, File, UploadFile, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
import json
import uuid
import os

from app.core.database import get_async_session
from app.auth.authentication import current_active_user
from app.models.models import MLModel, PreparedData, Dataset, User
from app.schemas.ml import MLModelCreate, MLModelUpdate, MLModel as MLModelSchema
from app.schemas.ml import PreparedDataCreate, PreparedData as PreparedDataSchema
from app.services.machine_learning import MachineLearningService

router = APIRouter(
    prefix="/ml",
    tags=["machine learning"],
    responses={404: {"description": "Not found"}},
)

@router.get("/models", response_model=List[MLModelSchema])
async def get_models(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve all ML models.
    """
    try:
        # Implement authorization filter
        if user.is_superuser:
            query = select(MLModel).options(selectinload(MLModel.datasets))
        else:
            query = select(MLModel).options(selectinload(MLModel.datasets)).where(MLModel.user_id == user.id)
        
        # Add project filter if provided
        if project_id is not None:
            query = query.where(MLModel.project_id == project_id)
        
        result = await db.execute(query)
        models = result.scalars().all()
        
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving models: {str(e)}")

@router.get("/models/{model_id}", response_model=MLModelSchema)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Retrieve a specific ML model by ID.
    """
    try:
        # Fetch the model with its datasets
        query = select(MLModel).options(selectinload(MLModel.datasets)).where(MLModel.id == model_id)
        result = await db.execute(query)
        model = result.scalar_one_or_none()
        
        # Check if model exists
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        
        # Check authorization
        if model.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
        return model
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving model: {str(e)}")

@router.post("/prepare-data", response_model=Dict[str, Any])
async def prepare_data(
    prepare_data_in: PreparedDataCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Prepare data for machine learning, including feature engineering.
    """
    try:
        # Fetch the dataset
        query = select(Dataset).where(Dataset.id == prepare_data_in.dataset_id)
        result = await db.execute(query)
        dataset = result.scalar_one_or_none()
        
        # Check if dataset exists
        if dataset is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
        
        # Check authorization
        if dataset.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this dataset")
        
        # Call the service to prepare the data
        service_result = MachineLearningService.prepare_data(
            dataset_file_path=dataset.file_path,
            target_column=prepare_data_in.target_column,
            feature_columns=prepare_data_in.feature_columns,
            network_metrics=prepare_data_in.network_metrics,
            network_id=prepare_data_in.network_id,
            test_size=prepare_data_in.test_size
        )
        
        # Create a new PreparedData record
        new_prepared_data = PreparedData(
            user_id=user.id,
            dataset_id=prepare_data_in.dataset_id,
            target_column=prepare_data_in.target_column,
            feature_columns=prepare_data_in.feature_columns,
            network_metrics=prepare_data_in.network_metrics,
            network_id=prepare_data_in.network_id,
            test_size=prepare_data_in.test_size,
            file_path=service_result.get("file_path")
        )
        
        # Save to database
        db.add(new_prepared_data)
        await db.commit()
        await db.refresh(new_prepared_data)
        
        # Return response with the ID and feature info
        return {
            "id": new_prepared_data.id,
            "feature_info": service_result.get("feature_info", {})
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing data: {str(e)}")

@router.post("/models", response_model=MLModelSchema, status_code=status.HTTP_201_CREATED)
async def create_model(
    prepared_data_id: int = Form(...),
    algorithm: str = Form(...),
    hyperparameters: str = Form(...),  # JSON string of hyperparameters
    model_name: str = Form(...),
    project_id: Optional[int] = Form(None),
    dataset_ids: Optional[List[int]] = Form([]),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
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
        
        # Fetch the prepared data
        query = select(PreparedData).where(PreparedData.id == prepared_data_id)
        result = await db.execute(query)
        prepared_data = result.scalar_one_or_none()
        
        # Check if prepared data exists
        if prepared_data is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prepared data not found")
        
        # Check authorization
        if prepared_data.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this prepared data")
        
        # Fetch datasets if dataset_ids provided
        datasets = []
        if dataset_ids:
            for dataset_id in dataset_ids:
                query = select(Dataset).where(Dataset.id == dataset_id)
                result = await db.execute(query)
                dataset = result.scalar_one_or_none()
                
                if dataset is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dataset with ID {dataset_id} not found")
                
                # Check authorization
                if dataset.user_id != user.id and not user.is_superuser:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Not authorized to use dataset with ID {dataset_id}")
                
                datasets.append(dataset)
        
        # Train model using the service
        model_result = MachineLearningService.train_model(
            prepared_data_path=prepared_data.file_path,
            algorithm=algorithm,
            hyperparameters=hyperparams,
            model_name=model_name
        )
        
        # Create new MLModel instance with UUID
        model_id = str(uuid.uuid4())
        new_model = MLModel(
            id=model_id,
            name=model_name,
            algorithm=algorithm,
            type=model_result.get("type", "classification"),  # Determine from result or prepared data
            description=f"Model created with {algorithm} algorithm",
            target_variable=prepared_data.target_column,
            user_id=user.id,
            project_id=project_id,
            hyperparameters=hyperparams,
            metrics=model_result.get("metrics"),
            feature_importances=model_result.get("feature_importances"),
            model_file_path=model_result.get("model_file_path"),
            status="trained"
        )
        
        # Associate datasets
        for dataset in datasets:
            new_model.datasets.append(dataset)
        
        # Save to database
        db.add(new_model)
        await db.commit()
        await db.refresh(new_model)
        
        return new_model
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Delete an ML model.
    """
    try:
        # Fetch the model
        query = select(MLModel).where(MLModel.id == model_id)
        result = await db.execute(query)
        model = result.scalar_one_or_none()
        
        # Check if model exists
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        
        # Check authorization
        if model.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
        # Call service to delete model files
        MachineLearningService.delete_model(model_id)
        
        # Delete from database
        await db.execute(delete(MLModel).where(MLModel.id == model_id))
        await db.commit()
        
        return None
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")

@router.post("/models/{model_id}/predict", response_model=Dict[str, Any])
async def predict(
    model_id: str,
    input_data: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Make predictions using a trained model.
    """
    try:
        # Fetch the model
        query = select(MLModel).where(MLModel.id == model_id)
        result = await db.execute(query)
        model = result.scalar_one_or_none()
        
        # Check if model exists
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        
        # Check authorization
        if model.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
        # Call service to make predictions
        predictions = MachineLearningService.predict(model_id, input_data)
        return predictions
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making predictions: {str(e)}")

@router.get("/models/{model_id}/feature-importance", response_model=Dict[str, Any])
async def get_feature_importance(
    model_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Get feature importance for a trained model.
    """
    try:
        # Fetch the model
        query = select(MLModel).where(MLModel.id == model_id)
        result = await db.execute(query)
        model = result.scalar_one_or_none()
        
        # Check if model exists
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        
        # Check authorization
        if model.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
        # If feature importances are stored in the model, return them
        if model.feature_importances:
            return {
                "model_id": model_id,
                "feature_importances": model.feature_importances
            }
        
        # Otherwise, call service to calculate them
        importances = MachineLearningService.get_feature_importances(model_id)
        return importances
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting feature importance: {str(e)}")

@router.post("/models/{model_id}/shap", response_model=Dict[str, Any])
async def generate_shap_values(
    model_id: str,
    num_samples: int = 100,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Generate SHAP values for model explanation.
    """
    try:
        # Fetch the model
        query = select(MLModel).where(MLModel.id == model_id)
        result = await db.execute(query)
        model = result.scalar_one_or_none()
        
        # Check if model exists
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        
        # Check authorization
        if model.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
        # Call service to generate SHAP values
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
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    """
    Evaluate the predictive power of network features for a given target.
    """
    try:
        # Fetch the network
        network_query = select(Network).where(Network.id == network_id)
        network_result = await db.execute(network_query)
        network = network_result.scalar_one_or_none()
        
        # Check if network exists
        if network is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network not found")
        
        # Check authorization
        if network.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this network")
            
        # Fetch the dataset
        dataset_query = select(Dataset).where(Dataset.id == dataset_id)
        dataset_result = await db.execute(dataset_query)
        dataset = dataset_result.scalar_one_or_none()
        
        # Check if dataset exists
        if dataset is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
        
        # Check authorization
        if dataset.user_id != user.id and not user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to use this dataset")
        
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
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating network features: {str(e)}")
