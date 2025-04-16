"""
Combined database models for OrgAI.
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text, Float, Boolean, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from fastapi_users.db import SQLAlchemyBaseUserTable

Base = declarative_base()

# Association tables for many-to-many relationships
user_project = Table(
    "user_project",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
)

# Association table for many-to-many relationship between Dataset and MLModel
dataset_mlmodel = Table(
    "dataset_mlmodel",
    Base.metadata,
    Column("dataset_id", Integer, ForeignKey("datasets.id"), primary_key=True),
    Column("ml_model_id", String(36), ForeignKey("ml_models.id"), primary_key=True),
)


class User(SQLAlchemyBaseUserTable[int], Base):
    """User model with FastAPI-Users integration."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(length=320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(length=1024), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Additional user fields
    username = Column(String(length=50), unique=True, index=True)
    first_name = Column(String(length=50))
    last_name = Column(String(length=50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    projects = relationship("Project", back_populates="user")
    datasets = relationship("Dataset", back_populates="user")
    networks = relationship("Network", back_populates="user")
    abm_models = relationship("ABMModel", back_populates="user")
    abm_simulations = relationship("ABMSimulation", back_populates="user")
    ml_models = relationship("MLModel", back_populates="user")
    prepared_data = relationship("PreparedData", back_populates="user")


class Project(Base):
    """Project model for organizing research activities."""
    
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)  # SNA, ML, ABM, GENERAL
    status = Column(String(50), default="active")  # active, archived, completed, draft
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="projects")
    
    # Relationships with other models
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    networks = relationship("Network", back_populates="project", cascade="all, delete-orphan")
    abm_models = relationship("ABMModel", back_populates="project", cascade="all, delete-orphan")
    ml_models = relationship("MLModel", back_populates="project", cascade="all, delete-orphan")


class Dataset(Base):
    """Dataset model for storing dataset metadata."""
    
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # CSV, JSON, XLSX, etc.
    size = Column(String(50))  # Human-readable size (e.g., "2.4 MB")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String(50), default="Raw")  # Raw, Processed, Anonymized, Needs Cleaning
    row_count = Column(Integer, nullable=True)
    
    # Store column names as JSON
    columns = Column(JSON, nullable=True)
    
    # File paths for storage
    file_path = Column(String(255), nullable=True)
    processed_file_path = Column(String(255), nullable=True)
    anonymized_file_path = Column(String(255), nullable=True)
    
    # Store tie strength definition as JSON
    tie_strength_definition = Column(JSON, nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    user = relationship("User", back_populates="datasets")
    project = relationship("Project", back_populates="datasets")
    
    # Relationships with other models
    networks = relationship("Network", back_populates="dataset", cascade="all, delete-orphan")
    prepared_data = relationship("PreparedData", back_populates="dataset", cascade="all, delete-orphan")
    ml_models = relationship("MLModel", secondary=dataset_mlmodel, back_populates="datasets")


class Network(Base):
    """Network model for storing network analysis data."""
    
    __tablename__ = "networks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    directed = Column(Boolean, default=False)
    weighted = Column(Boolean, default=False)
    node_count = Column(Integer, nullable=True)
    edge_count = Column(Integer, nullable=True)
    
    # File path for storage
    file_path = Column(String(255), nullable=True)
    
    # Store metrics and communities as JSON
    metrics = Column(JSON, nullable=True)
    communities = Column(JSON, nullable=True)
    
    # Additional attributes as JSON
    attributes = Column(JSON, nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    user = relationship("User", back_populates="networks")
    dataset = relationship("Dataset", back_populates="networks")
    project = relationship("Project", back_populates="networks")
    
    # Relationships with other models
    abm_models = relationship("ABMModel", back_populates="network")
    prepared_data = relationship("PreparedData", back_populates="network")


class ABMModel(Base):
    """Agent-Based Model for simulating organizational dynamics."""
    
    __tablename__ = "abm_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    simulation_type = Column(String(50), nullable=False)  # social_influence, diffusion_of_innovations, etc.
    status = Column(String(50), default="created")  # created, configured, running, error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Store model attributes as JSON
    attributes = Column(JSON, nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=True)
    
    user = relationship("User", back_populates="abm_models")
    project = relationship("Project", back_populates="abm_models")
    network = relationship("Network", back_populates="abm_models")
    
    # Relationships with other models
    simulations = relationship("ABMSimulation", back_populates="model", cascade="all, delete-orphan")


class ABMSimulation(Base):
    """Simulation run of an Agent-Based Model."""
    
    __tablename__ = "abm_simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="created")  # created, running, completed, error
    steps_executed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Store parameters and results as JSON
    parameters = Column(JSON, nullable=True)
    results_summary = Column(JSON, nullable=True)
    
    # Results file path
    results_file_path = Column(String(255), nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    model_id = Column(Integer, ForeignKey("abm_models.id"))
    
    user = relationship("User", back_populates="abm_simulations")
    model = relationship("ABMModel", back_populates="simulations")


class MLModel(Base):
    """Machine Learning model for organizational data analysis."""
    
    __tablename__ = "ml_models"
    
    id = Column(String(36), primary_key=True)  # UUID
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    algorithm = Column(String(50), nullable=False)  # random_forest, logistic_regression, etc.
    type = Column(String(50), nullable=False)  # classification, regression
    status = Column(String(50), default="created")  # created, trained, failed
    target_variable = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Store hyperparameters, metrics, and feature importances as JSON
    hyperparameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    feature_importances = Column(JSON, nullable=True)
    
    # Model file path
    model_file_path = Column(String(255), nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    user = relationship("User", back_populates="ml_models")
    project = relationship("Project", back_populates="ml_models")
    
    # Many-to-many relationship with datasets
    datasets = relationship("Dataset", secondary=dataset_mlmodel, back_populates="ml_models")


class PreparedData(Base):
    """Prepared data for machine learning."""
    
    __tablename__ = "prepared_data"
    
    id = Column(Integer, primary_key=True, index=True)
    target_column = Column(String(255), nullable=False)
    test_size = Column(Float, default=0.2)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Store feature columns and network metrics as JSON
    feature_columns = Column(JSON, nullable=True)
    network_metrics = Column(JSON, nullable=True)
    
    # Prepared data file path
    file_path = Column(String(255), nullable=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=True)
    
    user = relationship("User", back_populates="prepared_data")
    dataset = relationship("Dataset", back_populates="prepared_data")
    network = relationship("Network", back_populates="prepared_data")