import { useState, useContext, createContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        user: null,
        token: "",
    });

    //default axios
    useEffect(() => {
        axios.defaults.headers.common["Authorization"] = auth?.token;
    }, [auth]);

    useEffect(() => {
        const data = localStorage.getItem("auth");

        try {
            if (data) {
                const parseData = JSON.parse(data);
                setAuth((prevAuth) => ({
                    ...prevAuth,
                    user: parseData.user,
                    token: parseData.token,
                }));
            }
        } catch (error) {
            console.error("Failed to parse auth from localStorage", error);
        }
    }, []);
    return (
        <AuthContext.Provider value={[auth, setAuth]}>
            {children}
        </AuthContext.Provider>
    );
};

// custom hook
const useAuth = () => useContext(AuthContext);

export {useAuth, AuthProvider};