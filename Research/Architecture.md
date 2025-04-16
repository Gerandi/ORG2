# OrgAl Platform - Modular Architecture Plan

A comprehensive modular architecture for the OrgAl platform using atomic design principles, suitable for a Vite React.js with TypeScript frontend and FastAPI backend.

## 1. Frontend Architecture

### Atomic Components Structure

#### Atoms (src/components/atoms)
Basic building blocks - reusable across the entire application:

```
atoms/
  ├── Button/
  │   ├── Button.tsx
  │   ├── Button.test.tsx
  │   └── index.ts
  ├── Input/
  ├── Select/
  ├── Checkbox/
  ├── RadioButton/
  ├── Toggle/
  ├── Badge/
  ├── Icon/
  ├── Typography/
  │   ├── Heading.tsx
  │   ├── Paragraph.tsx
  │   └── Text.tsx
  ├── Card/
  ├── Tooltip/
  └── Spinner/
```

#### Molecules (src/components/molecules)
Combinations of atoms forming simple UI components:

```
molecules/
  ├── FormField/
  │   ├── FormField.tsx
  │   ├── FormField.test.tsx
  │   └── index.ts
  ├── SearchBar/
  ├── Pagination/
  ├── Tabs/
  ├── DropdownMenu/
  ├── Modal/
  ├── Alert/
  ├── DataTable/
  ├── NetworkNode/
  ├── NetworkEdge/
  ├── ChartBar/
  └── MetricCard/
```

#### Organisms (src/components/organisms)
Complex UI components specific to certain features:

```
organisms/
  ├── Navigation/
  │   ├── Sidebar.tsx
  │   ├── Header.tsx
  │   └── index.ts
  ├── DataImport/
  ├── NetworkVisualization/
  ├── ModelTrainingForm/
  ├── SimulationControls/
  ├── FeatureSelectionPanel/
  ├── DataPreviewTable/
  ├── MetricsPanel/
  ├── ParameterPanel/
  └── ValidationResults/
```

### Module-Specific Components (src/modules)

For each of the four core modules, organize components by feature:

```
modules/
  ├── dashboard/
  │   ├── components/
  │   │   ├── ProjectSummary.tsx
  │   │   ├── StatisticsCard.tsx
  │   │   └── RecentActivity.tsx
  │   ├── hooks/
  │   ├── utils/
  │   └── Dashboard.tsx
  ├── dataManagement/
  │   ├── components/
  │   │   ├── DataSourceList.tsx
  │   │   ├── DataPreprocessingPanel.tsx
  │   │   ├── TieStrengthDefinition.tsx
  │   │   └── AnonymizationTools.tsx
  │   ├── hooks/
  │   ├── utils/
  │   └── DataManagement.tsx
  ├── sna/
  │   ├── components/
  │   │   ├── NetworkCanvas.tsx
  │   │   ├── MetricsCalculation.tsx
  │   │   ├── CommunityDetection.tsx
  │   │   └── LinkPrediction.tsx
  │   ├── hooks/
  │   ├── utils/
  │   └── SNA.tsx
  ├── machineLearning/
  │   ├── components/
  │   │   ├── FeatureEngineering.tsx
  │   │   ├── ModelSelection.tsx
  │   │   ├── ValidationPanel.tsx
  │   │   └── ModelInterpretation.tsx
  │   ├── hooks/
  │   ├── utils/
  │   └── MachineLearning.tsx
  └── abm/
      ├── components/
      │   ├── AgentDefinition.tsx
      │   ├── BehaviorRules.tsx
      │   ├── EnvironmentSettings.tsx
      │   └── SimulationView.tsx
      ├── hooks/
      ├── utils/
      └── ABM.tsx
```

### Shared Logic (src/shared)

```
shared/
  ├── hooks/
  │   ├── useDataSource.ts
  │   ├── useNetworkMetrics.ts
  │   ├── useModelTraining.ts
  │   └── useSimulation.ts
  ├── contexts/
  │   ├── AuthContext.tsx
  │   ├── ProjectContext.tsx
  │   └── DataContext.tsx
  ├── services/
  │   ├── api.ts
  │   ├── dataService.ts
  │   ├── networkService.ts
  │   ├── mlService.ts
  │   └── abmService.ts
  └── utils/
      ├── formatting.ts
      ├── validation.ts
      ├── networkUtils.ts
      └── modelUtils.ts
```

### Frontend Application Structure

```
src/
  ├── components/
  │   ├── atoms/
  │   ├── molecules/
  │   └── organisms/
  ├── modules/
  │   ├── dashboard/
  │   ├── dataManagement/
  │   ├── sna/
  │   ├── machineLearning/
  │   └── abm/
  ├── shared/
  │   ├── hooks/
  │   ├── contexts/
  │   ├── services/
  │   └── utils/
  ├── layouts/
  │   ├── MainLayout.tsx
  │   └── AuthLayout.tsx
  ├── pages/
  │   ├── Dashboard.tsx
  │   ├── DataManagement.tsx
  │   ├── SNA.tsx
  │   ├── MachineLearning.tsx
  │   ├── ABM.tsx
  │   ├── Login.tsx
  │   └── Settings.tsx
  ├── routes/
  │   └── index.tsx
  ├── types/
  │   ├── common.ts
  │   ├── data.ts
  │   ├── network.ts
  │   ├── ml.ts
  │   └── abm.ts
  ├── App.tsx
  └── main.tsx
```

## 2. Backend Architecture (FastAPI)

```
backend/
  ├── app/
  │   ├── api/
  │   │   ├── routes/
  │   │   │   ├── auth.py
  │   │   │   ├── projects.py
  │   │   │   ├── data.py
  │   │   │   ├── network.py
  │   │   │   ├── ml.py
  │   │   │   └── abm.py
  │   │   └── deps.py
  │   ├── core/
  │   │   ├── config.py
  │   │   ├── security.py
  │   │   └── errors.py
  │   ├── db/
  │   │   ├── session.py
  │   │   └── base.py
  │   ├── models/
  │   │   ├── user.py
  │   │   ├── project.py
  │   │   ├── dataset.py
  │   │   ├── network.py
  │   │   ├── ml_model.py
  │   │   └── abm_model.py
  │   ├── schemas/
  │   │   ├── user.py
  │   │   ├── project.py
  │   │   ├── dataset.py
  │   │   ├── network.py
  │   │   ├── ml.py
  │   │   └── abm.py
  │   ├── services/
  │   │   ├── data_processing.py
  │   │   ├── network_analysis.py
  │   │   ├── machine_learning.py
  │   │   └── abm_simulation.py
  │   └── main.py
  ├── tests/
  │   ├── api/
  │   ├── services/
  │   └── conftest.py
  ├── alembic/
  ├── requirements.txt
  └── .env
```

## 3. Key Integration Points

### Frontend-Backend Communication

1. **API Service Layer**
   ```typescript
   // src/shared/services/api.ts
   import axios from 'axios';

   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });

   api.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   export default api;
   ```

2. **Domain-Specific Services**
   ```typescript
   // src/shared/services/networkService.ts
   import api from './api';
   import { NetworkData, NetworkMetrics } from '../types/network';

   export const networkService = {
     async getNetworkData(datasetId: string): Promise<NetworkData> {
       const response = await api.get(`/api/network/data/${datasetId}`);
       return response.data;
     },
     
     async calculateMetrics(networkId: string, metrics: string[]): Promise<NetworkMetrics> {
       const response = await api.post(`/api/network/metrics/${networkId}`, { metrics });
       return response.data;
     },
     
     // More methods for other SNA functionality
   };
   ```

### Cross-Module Communication

Each module needs to communicate with others. For example, SNA metrics need to be available to ML module:

```typescript
// src/shared/contexts/DataContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Dataset, NetworkData, NetworkMetrics } from '../types';

interface DataContextProps {
  datasets: Dataset[];
  networks: NetworkData[];
  networkMetrics: Record<string, NetworkMetrics>;
  selectedDatasetId: string | null;
  selectedNetworkId: string | null;
  setSelectedDatasetId: (id: string | null) => void;
  setSelectedNetworkId: (id: string | null) => void;
  // More state and methods
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<Record<string, NetworkMetrics>>({});
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  
  // Implementation of context methods
  
  return (
    <DataContext.Provider value={{
      datasets,
      networks,
      networkMetrics,
      selectedDatasetId,
      selectedNetworkId,
      setSelectedDatasetId,
      setSelectedNetworkId,
      // More methods
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
```

## 4. Example Component Implementation

Here's how the NetworkVisualization component might be implemented:

```tsx
// src/modules/sna/components/NetworkVisualization.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useDataContext } from '../../../shared/contexts/DataContext';
import { Button } from '../../../components/atoms/Button';
import { Select } from '../../../components/atoms/Select';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as d3 from 'd3';

interface NetworkVisualizationProps {
  networkId: string;
  width?: number;
  height?: number;
  showControls?: boolean;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  networkId,
  width = 800,
  height = 600,
  showControls = true,
}) => {
  const { networks, networkMetrics } = useDataContext();
  const [layout, setLayout] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [colorBy, setColorBy] = useState<'department' | 'role' | 'centrality'>('department');
  const [sizeBy, setSizeBy] = useState<'uniform' | 'degree' | 'betweenness'>('degree');
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Find the current network
  const network = networks.find(n => n.id === networkId);
  
  useEffect(() => {
    if (!network || !svgRef.current) return;
    
    // D3 visualization code would go here
    // This would include force simulation setup, node/link rendering, etc.
    
  }, [network, layout, colorBy, sizeBy, width, height]);
  
  if (!network) {
    return <div>No network data found</div>;
  }
  
  return (
    <div className="flex flex-col h-full">
      {showControls && (
        <div className="bg-white p-2 flex justify-between items-center border-b">
          <div className="flex space-x-2">
            <Button variant="icon" onClick={() => {}}>
              <ZoomIn size={18} />
            </Button>
            <Button variant="icon" onClick={() => {}}>
              <ZoomOut size={18} />
            </Button>
            <Button variant="icon" onClick={() => {}}>
              <Maximize2 size={18} />
            </Button>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">Layout:</span>
              <Select
                value={layout}
                onChange={(e) => setLayout(e.target.value as any)}
                options={[
                  { value: 'force', label: 'Force-directed' },
                  { value: 'circular', label: 'Circular' },
                  { value: 'hierarchical', label: 'Hierarchical' },
                ]}
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">Color by:</span>
              <Select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
                options={[
                  { value: 'department', label: 'Department' },
                  { value: 'role', label: 'Role' },
                  { value: 'centrality', label: 'Centrality' },
                ]}
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">Size by:</span>
              <Select
                value={sizeBy}
                onChange={(e) => setSizeBy(e.target.value as any)}
                options={[
                  { value: 'uniform', label: 'Uniform' },
                  { value: 'degree', label: 'Degree Centrality' },
                  { value: 'betweenness', label: 'Betweenness Centrality' },
                ]}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          className="border border-gray-200 bg-white rounded-md"
        />
      </div>
    </div>
  );
};
```

## 5. TypeScript Types

```typescript
// src/types/network.ts
export interface Node {
  id: string;
  label: string;
  attributes: Record<string, any>;
}

export interface Edge {
  source: string;
  target: string;
  weight?: number;
  attributes?: Record<string, any>;
}

export interface NetworkData {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkMetrics {
  networkId: string;
  globalMetrics: {
    density: number;
    averagePathLength: number;
    diameter: number;
    clustering: number;
    modularity?: number;
  };
  nodeMetrics: Record<string, {
    degree: number;
    betweenness?: number;
    closeness?: number;
    eigenvector?: number;
    clustering?: number;
  }>;
}

// More type definitions...
```

## 6. Build and Development Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

This modular architecture provides:

1. **Clear Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be reused across modules
3. **Maintainability**: Changes to one area have minimal impact on others
4. **Testability**: Each component can be tested in isolation
5. **Scalability**: New features can be added without major restructuring

When implementing this, you'll want to begin with the atoms and build upward, testing each component in isolation before integrating them into the larger system.