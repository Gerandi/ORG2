import asyncio
import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import async_session_maker
from app.models.models import (
    User, Project, Dataset, Network, ABMModel, ABMSimulation, MLModel, PreparedData,
    AgentAttributeDefinition, AgentStateVariableDefinition,
    AgentBehaviorDefinition, EnvironmentVariableDefinition
)

# Load environment variables from .env file
load_dotenv()

async def seed_admin_user() -> User:
    """Create admin user if it doesn't exist."""
    async with async_session_maker() as session:
        # Check if admin user already exists
        result = await session.execute(select(User).where(User.email == "admin@orgai.com"))
        admin = result.scalars().first()
        
        if admin:
            print("Admin user already exists")
            return admin
        
        # Create admin user
        from app.auth.authentication import get_password_hash
        
        admin = User(
            email="admin@orgai.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),  # Change in production
            is_active=True,
            is_superuser=True,
            is_verified=True,
            first_name="Admin",
            last_name="User",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        
        print("Created admin user")
        return admin


async def seed_projects(user: User) -> List[Project]:
    """Seed sample projects."""
    async with async_session_maker() as session:
        # Create sample projects if they don't exist
        result = await session.execute(select(Project))
        existing_projects = result.scalars().all()
        
        if existing_projects:
            print(f"Found {len(existing_projects)} existing projects")
            return existing_projects
        
        # Sample projects
        project_data = [
            {
                "name": "Communication Patterns Study",
                "description": "Analysis of communication patterns in a medium-sized organization",
                "type": "SNA",
                "status": "active"
            },
            {
                "name": "Team Performance Prediction",
                "description": "Machine learning model to predict team performance based on collaboration metrics",
                "type": "ML",
                "status": "active"
            },
            {
                "name": "Organizational Culture Simulation",
                "description": "Agent-based model simulating the evolution of organizational culture",
                "type": "ABM",
                "status": "active"
            }
        ]
        
        projects = []
        for data in project_data:
            project = Project(
                name=data["name"],
                description=data["description"],
                type=data["type"],
                status=data["status"],
                user_id=user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(project)
            projects.append(project)
        
        await session.commit()
        for project in projects:
            await session.refresh(project)
        
        print(f"Created {len(projects)} projects")
        return projects


async def seed_datasets(user: User, projects: List[Project]) -> List[Dataset]:
    """Seed sample datasets."""
    async with async_session_maker() as session:
        # Check for existing datasets
        result = await session.execute(select(Dataset))
        existing_datasets = result.scalars().all()
        
        if existing_datasets:
            print(f"Found {len(existing_datasets)} existing datasets")
            return existing_datasets
        
        # Sample datasets
        dataset_data = [
            {
                "name": "Employee Communication Data",
                "type": "CSV",
                "size": "2.4 MB",
                "description": "Email and messaging data between employees",
                "status": "Raw",
                "project_index": 0,  # Index in projects list
                "row_count": 5000,
                "columns": ["sender", "receiver", "timestamp", "channel", "message_type", "duration"]
            },
            {
                "name": "Team Performance Metrics",
                "type": "CSV",
                "size": "1.1 MB",
                "description": "Quarterly performance metrics for teams",
                "status": "Processed",
                "project_index": 1,
                "row_count": 120,
                "columns": ["team_id", "quarter", "year", "kpi_1", "kpi_2", "kpi_3", "overall_score"]
            },
            {
                "name": "Employee Survey Results",
                "type": "JSON",
                "size": "3.2 MB",
                "description": "Results from annual employee culture survey",
                "status": "Anonymized",
                "project_index": 2,
                "row_count": 350,
                "columns": ["respondent_id", "department", "tenure", "q1", "q2", "q3", "q4", "q5", "comments"]
            }
        ]
        
        datasets = []
        for data in dataset_data:
            dataset = Dataset(
                name=data["name"],
                type=data["type"],
                size=data["size"],
                description=data["description"],
                status=data["status"],
                user_id=user.id,
                project_id=projects[data["project_index"]].id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                row_count=data["row_count"],
                columns=data["columns"]
            )
            session.add(dataset)
            datasets.append(dataset)
        
        await session.commit()
        for dataset in datasets:
            await session.refresh(dataset)
        
        print(f"Created {len(datasets)} datasets")
        return datasets


async def seed_networks(user: User, datasets: List[Dataset], projects: List[Project]) -> List[Network]:
    """Seed sample networks."""
    async with async_session_maker() as session:
        # Check for existing networks
        result = await session.execute(select(Network))
        existing_networks = result.scalars().all()
        
        if existing_networks:
            print(f"Found {len(existing_networks)} existing networks")
            return existing_networks
        
        # Sample networks
        network_data = [
            {
                "name": "Email Communication Network",
                "description": "Network of email communications between employees",
                "directed": True,
                "weighted": True,
                "node_count": 150,
                "edge_count": 2345,
                "dataset_index": 0,  # Index in datasets list
                "project_index": 0,  # Index in projects list
                "metrics": {
                    "density": 0.21,
                    "average_path_length": 2.7,
                    "diameter": 6,
                    "clustering": 0.45
                },
                "attributes": {
                    "source_col": "sender",
                    "target_col": "receiver",
                    "weight_col": "frequency"
                }
            },
            {
                "name": "Team Collaboration Network",
                "description": "Network of collaboration between teams",
                "directed": False,
                "weighted": True,
                "node_count": 12,
                "edge_count": 40,
                "dataset_index": 1,
                "project_index": 1,
                "metrics": {
                    "density": 0.61,
                    "average_path_length": 1.4,
                    "diameter": 3,
                    "clustering": 0.72
                },
                "attributes": {
                    "source_col": "team_a",
                    "target_col": "team_b",
                    "weight_col": "collaboration_score"
                }
            }
        ]
        
        networks = []
        for data in network_data:
            network = Network(
                name=data["name"],
                description=data["description"],
                directed=data["directed"],
                weighted=data["weighted"],
                node_count=data["node_count"],
                edge_count=data["edge_count"],
                dataset_id=datasets[data["dataset_index"]].id if data.get("dataset_index") is not None else None,
                project_id=projects[data["project_index"]].id,
                user_id=user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                metrics=data["metrics"],
                attributes=data["attributes"]
            )
            session.add(network)
            networks.append(network)
        
        await session.commit()
        for network in networks:
            await session.refresh(network)
        
        print(f"Created {len(networks)} networks")
        return networks


async def seed_abm_models(user: User, projects: List[Project], networks: List[Network]) -> List[ABMModel]:
    """Seed sample ABM models."""
    async with async_session_maker() as session:
        # Check for existing ABM models
        result = await session.execute(select(ABMModel))
        existing_models = result.scalars().all()
        
        if existing_models:
            print(f"Found {len(existing_models)} existing ABM models")
            return existing_models
        
        # Sample ABM models
        model_data = [
            {
                "name": "Social Influence Model",
                "description": "Model of social influence in organizational culture",
                "simulation_type": "social_influence",
                "status": "created",
                "project_index": 2,  # Index in projects list
                "network_index": 0  # Index in networks list (optional)
            },
            {
                "name": "Innovation Diffusion Model",
                "description": "Model of innovation diffusion in teams",
                "simulation_type": "diffusion_of_innovations",
                "status": "configured",
                "project_index": 2,
                "network_index": 1
            }
        ]
        
        models = []
        for data in model_data:
            model = ABMModel(
                name=data["name"],
                description=data["description"],
                simulation_type=data["simulation_type"],
                status=data["status"],
                project_id=projects[data["project_index"]].id,
                network_id=networks[data["network_index"]].id if data.get("network_index") is not None else None,
                user_id=user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(model)
            
            # Add sample definitions for the first seeded model (Social Influence)
            if data["name"] == "Social Influence Model":
                # Sample Agent Attributes
                model.agent_attributes.append(AgentAttributeDefinition(name="influenceability", type="number", default_value_json=0.5))
                # Sample State Variables
                model.agent_state_variables.append(AgentStateVariableDefinition(name="opinion", type="number", default_value_json=0.5, min_value=0, max_value=1))
                # Sample Behaviors
                model.agent_behaviors.append(AgentBehaviorDefinition(name="update_opinion", description="Update opinion based on neighbors"))
                # Sample Environment Variables
                model.environment_variables.append(EnvironmentVariableDefinition(name="influence_strength", type="number", default_value_json=0.1))
                model.environment_variables.append(EnvironmentVariableDefinition(name="conformity_bias", type="number", default_value_json=0.3))

            # Add sample definitions for the second seeded model (Innovation Diffusion)
            elif data["name"] == "Innovation Diffusion Model":
                model.agent_attributes.append(AgentAttributeDefinition(name="innovativeness", type="number", default_value_json=0.5))
                model.agent_state_variables.append(AgentStateVariableDefinition(name="adoption_status", type="boolean", default_value_json=False))
                model.agent_state_variables.append(AgentStateVariableDefinition(name="adoption_threshold", type="number", default_value_json=0.3))
                model.agent_behaviors.append(AgentBehaviorDefinition(name="evaluate_adoption", description="Decide whether to adopt"))
                model.environment_variables.append(EnvironmentVariableDefinition(name="initial_adopters", type="number", default_value_json=0.05))
                model.environment_variables.append(EnvironmentVariableDefinition(name="influence_decay", type="number", default_value_json=0.1))
                
            models.append(model)
        
        await session.commit()
        for model in models:
            await session.refresh(model)
        
        print(f"Created {len(models)} ABM models")
        return models


async def seed_ml_models(user: User, projects: List[Project], datasets: List[Dataset]) -> List[MLModel]:
    """Seed sample ML models."""
    async with async_session_maker() as session:
        # Check for existing ML models
        result = await session.execute(select(MLModel))
        existing_models = result.scalars().all()
        
        if existing_models:
            print(f"Found {len(existing_models)} existing ML models")
            return existing_models
        
        # Sample ML models
        import uuid
        
        model_data = [
            {
                "id": str(uuid.uuid4()),
                "name": "Team Performance Predictor",
                "description": "Regression model to predict team performance",
                "algorithm": "random_forest",
                "type": "regression",
                "status": "trained",
                "target_variable": "overall_score",
                "project_index": 1,  # Index in projects list
                "dataset_indices": [1],  # Indices in datasets list
                "hyperparameters": {
                    "n_estimators": 100,
                    "max_depth": 10,
                    "min_samples_split": 5
                },
                "metrics": {
                    "r2": 0.78,
                    "mae": 0.12,
                    "mse": 0.04
                },
                "feature_importances": {
                    "kpi_1": 0.35,
                    "kpi_2": 0.25,
                    "kpi_3": 0.40
                }
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Communication Pattern Classifier",
                "description": "Classification model for communication patterns",
                "algorithm": "logistic_regression",
                "type": "classification",
                "status": "trained",
                "target_variable": "message_type",
                "project_index": 0,
                "dataset_indices": [0],
                "hyperparameters": {
                    "C": 1.0,
                    "penalty": "l2",
                    "solver": "lbfgs"
                },
                "metrics": {
                    "accuracy": 0.85,
                    "precision": 0.82,
                    "recall": 0.79,
                    "f1": 0.80
                },
                "feature_importances": {
                    "channel": 0.45,
                    "sender_department": 0.30,
                    "timestamp_hour": 0.25
                }
            }
        ]
        
        ml_models = []
        for data in model_data:
            model = MLModel(
                id=data["id"],
                name=data["name"],
                description=data["description"],
                algorithm=data["algorithm"],
                type=data["type"],
                status=data["status"],
                target_variable=data["target_variable"],
                project_id=projects[data["project_index"]].id,
                user_id=user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                hyperparameters=data["hyperparameters"],
                metrics=data["metrics"],
                feature_importances=data["feature_importances"]
            )
            session.add(model)
            
            # Associate datasets with ML model
            for idx in data["dataset_indices"]:
                model.datasets.append(datasets[idx])
        
        await session.commit()
        for model in ml_models:
            await session.refresh(model)
        
        print(f"Created {len(ml_models)} ML models")
        return ml_models


async def seed_db():
    """Initialize database with sample data."""
    print("Seeding database with sample data...")
    
    # Create admin user
    admin = await seed_admin_user()
    
    # Create projects
    projects = await seed_projects(admin)
    
    # Create datasets
    datasets = await seed_datasets(admin, projects)
    
    # Create networks
    networks = await seed_networks(admin, datasets, projects)
    
    # Create ABM models
    abm_models = await seed_abm_models(admin, projects, networks)
    
    # Create ML models
    ml_models = await seed_ml_models(admin, projects, datasets)
    
    print("Database seeding completed!")


if __name__ == "__main__":
    """Execute this script directly to seed the database."""
    asyncio.run(seed_db())