import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
    openModal: (content: ReactNode) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalContent, setModalContent] = useState<ReactNode | null>(null);

    const openModal = (content: ReactNode) => {
        setModalContent(content);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {modalContent}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
