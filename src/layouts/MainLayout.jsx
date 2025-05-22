import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./MainLayout.module.css";

const MainLayout = ({ children }) => {
    return (
        <div className={styles.layoutContainer}>
            <Navbar />
            <main className={styles.mainContent}>{children}</main>
            <Footer />
        </div>
    );
};

export default MainLayout;
