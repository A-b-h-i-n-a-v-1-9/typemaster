import React from "react";
import { Link } from "react-router-dom";
import styles from "./Home.module.css";

const Home = () => {
    return (
        <div>
            <section className={styles.heroSection}>
                <h2 className={styles.heroTitle}>
                    Speed kills but not everywhere 😉
                </h2>
                <p className={styles.heroText}>
                    Join live typing races with friends or practice solo to improve your
                    speed and accuracy.
                </p>
                <div>
                    <Link to="/create-room" className={styles.heroButtonPrimary}>
                        Create Room
                    </Link>
                    <Link to="/join-room" className={styles.heroButtonSecondary}>
                        Join Race
                    </Link>
                </div>
            </section>

            <section className={styles.benefitsSection}>
                <h3 className={styles.benefitsTitle}>Why Improve Your Typing Speed?</h3>
                <div className={styles.benefitsGrid}>
                    <div className={styles.benefitItem}>
                        <div className={styles.benefitIcon}>⚡️</div>
                        <h4 className={styles.benefitTitle}>Boost Productivity</h4>
                        <p>
                            Type faster to save hours daily and get more done with less effort.
                        </p>
                    </div>
                    <div className={styles.benefitItem}>
                        <div className={styles.benefitIcon}>🎮</div>
                        <h4 className={styles.benefitTitle}>Level Up Gaming</h4>
                        <p>
                            Fast typing helps in chat and commands, giving you an edge in
                            multiplayer games.
                        </p>
                    </div>
                    <div className={styles.benefitItem}>
                        <div className={styles.benefitIcon}>💼</div>
                        <h4 className={styles.benefitTitle}>Career Edge</h4>
                        <p>
                            Many jobs value typing skills — stand out and work more efficiently.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
