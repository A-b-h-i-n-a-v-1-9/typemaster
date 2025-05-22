import React from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = () => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.navbarContainer}>
                <h1 className="text-2xl font-bold cursor-pointer">TypeRace</h1>
                <div>
                    <Link to="/create-room" className={styles.navButton}>Create Room</Link>
                    <Link to="/join-room" className={styles.navButton}>Join Race</Link>
                    <button className={styles.navButton}>Practice</button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
