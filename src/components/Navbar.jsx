import React from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = () => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.navbarContainer}>
                <Link to="/" className={styles.brandName}>
                    <h1 className={styles.brandName}>Typix</h1>
                </Link>
                <div>
                    <Link to="/create-room" className={styles.navButton}>Create Room</Link>
                    <Link to="/join-room" className={styles.navButton}>Join Race</Link>
                    <Link to="/practice" className={styles.navButton}>Practice</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
