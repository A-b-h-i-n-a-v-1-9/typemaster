import React from "react";
import styles from "./Footer.module.css";

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <p>
                © 2025 Typix — Made with ❤️, caffeine ☕, and a sprinkle of magic ✨ by{" "}
                <a
                    href="https://x.com/Abhinav04139720"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "white", textDecoration: "none" }}
                >
                    Abhinav
                </a>
                , your friendly neighborhood coder!
            </p>
        </footer>
    );
};

export default Footer;
