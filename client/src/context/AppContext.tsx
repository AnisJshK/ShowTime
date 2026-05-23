import { createContext, useContext, type ReactNode } from "react";


export const AppContext = createContext<{}|undefined>(undefined)

export const useAppContext = () => useContext(AppContext)