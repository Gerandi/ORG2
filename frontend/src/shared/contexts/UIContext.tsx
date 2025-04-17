import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextProps {
  isCreateProjectModalOpen: boolean;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);

  const openCreateProjectModal = () => {
    setIsCreateProjectModalOpen(true);
  };

  const closeCreateProjectModal = () => {
    setIsCreateProjectModalOpen(false);
  };

  return (
    <UIContext.Provider
      value={{
        isCreateProjectModalOpen,
        openCreateProjectModal,
        closeCreateProjectModal,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUIContext = (): UIContextProps => {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  
  return context;
};

export default UIContext;