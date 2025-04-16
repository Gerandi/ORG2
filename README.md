# OrgAI Platform

A comprehensive platform for organizational behavior research, integrating social network analysis, machine learning, and agent-based modeling.

## Project Structure

- **Frontend**: React with TypeScript, Vite, and Tailwind CSS
- **Backend**: Python FastAPI

## Features

- **Data Management**: Import, clean, and manage research data
- **Social Network Analysis**: Visualize and analyze organizational networks
- **Machine Learning**: Build and evaluate predictive models
- **Agent-Based Modeling**: Simulate organizational behavior

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd OrgAI
```

2. Set up the frontend

```bash
cd frontend
npm install
```

3. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Development Servers

You can use the provided script to start both frontend and backend servers:

```bash
./start-dev.sh
```

Or start them individually:

#### Frontend

```bash
cd frontend
npm run dev
```

#### Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

## Architecture

The application follows atomic design principles for the frontend and a modular structure for the backend:

### Frontend

- **Atoms**: Basic UI components like buttons, inputs, etc.
- **Molecules**: Combinations of atoms forming simple UI components
- **Organisms**: Complex UI components specific to certain features
- **Pages**: Complete screens combining multiple organisms
- **Contexts**: Global state management using React Context
- **Services**: API communication and data handling

### Backend

- **API Routes**: Endpoints for different modules (projects, data, network, etc.)
- **Models**: Data models for the database
- **Schemas**: Pydantic schemas for request/response validation
- **Services**: Business logic for different features

## Contributing

Please follow the code style guidelines in CLAUDE.md when contributing to this project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.