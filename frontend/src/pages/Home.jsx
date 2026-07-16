import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import FoodCard from '../components/FoodCard'
import { foodApi } from '../services/api'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([foodApi.getFeatured(), foodApi.getRecommended()])
      .then(([featuredRes, recommendedRes]) => {
        if (featuredRes.success) setFeatured(featuredRes.foods)
        if (recommendedRes.success) setRecommended(recommendedRes.foods)
      })
      .catch(err => console.error('Failed to load data:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (featured.length === 0 && recommended.length === 0) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.food-card').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [featured, recommended])

  return (
    <div className="page-wrapper">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-text">
            <div className="hero-badge">
              <i className="fas fa-bolt"></i> Fast Delivery in 30 Minutes
            </div>
            <h1 className="hero-title">
              Delicious Food<br />
              <span>Delivered</span> to<br />
              Your Door
            </h1>
            <p className="hero-subtitle">
              Discover your favorite dishes from our curated menu. Fresh ingredients, amazing flavors, delivered hot & fast to your doorstep.
            </p>
            <div className="hero-actions">
              <Link to="/menu" className="btn btn-primary btn-lg">
                <i className="fas fa-utensils"></i> Explore Menu
              </Link>
              <a href="#how-it-works" className="btn btn-outline btn-lg">
                <i className="fas fa-play-circle"></i> How It Works
              </a>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80"
              alt="Delicious food spread"
              className="hero-img-main"
            />
            <div className="hero-float-card card-delivery">
              <i className="fas fa-motorcycle"></i>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Delivery Time</div>
                <div>30 min</div>
              </div>
            </div>
            <div className="hero-float-card card-rating">
              <i className="fas fa-star"></i>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Rating</div>
                <div>4.9 / 5</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="section" style={{ background: '#f9f9f9' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-tag"><i className="fas fa-thumbs-up"></i> Most Loved</div>
              <h2 className="section-title">Recommended For You</h2>
              <p className="section-subtitle">Our most frequently ordered and highly rated dishes</p>
            </div>
            <div className="food-grid">
              {recommended.map(food => <FoodCard key={food._id} food={food} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag"><i className="fas fa-fire"></i> Today&apos;s Specials</div>
            <h2 className="section-title">Featured Dishes</h2>
            <p className="section-subtitle">Handpicked favorites loved by our customers every day</p>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : featured.length > 0 ? (
            <>
              <div className="food-grid">
                {featured.map(food => <FoodCard key={food._id} food={food} />)}
              </div>
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Link to="/menu" className="btn btn-primary btn-lg">
                  <i className="fas fa-th-large"></i> View Full Menu
                </Link>
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              No featured items available.{' '}
              <Link to="/menu">View full menu</Link>
            </p>
          )}
        </div>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Simple Process</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Order your favorite food in just 3 easy steps</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-search"></i></div>
              <div className="step-num">Step 01</div>
              <h3 className="step-title">Browse Menu</h3>
              <p className="step-desc">Explore our diverse menu filled with delicious options from multiple categories.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-shopping-cart"></i></div>
              <div className="step-num">Step 02</div>
              <h3 className="step-title">Add to Cart</h3>
              <p className="step-desc">Select your favorite dishes, customize quantities, and add them to your cart.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-credit-card"></i></div>
              <div className="step-num">Step 03</div>
              <h3 className="step-title">Checkout</h3>
              <p className="step-desc">Enter your delivery address and confirm your order with a single click.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-motorcycle"></i></div>
              <div className="step-num">Step 04</div>
              <h3 className="step-title">Get Delivered</h3>
              <p className="step-desc">Sit back and relax! Your food will be at your door within 30 minutes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Our Promise</div>
            <h2 className="section-title">Why Choose QuickBite?</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-leaf"></i></div>
              <h3 className="step-title">Fresh Ingredients</h3>
              <p className="step-desc">We use only the freshest, locally sourced ingredients for every dish we prepare.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-bolt"></i></div>
              <h3 className="step-title">Fast Delivery</h3>
              <p className="step-desc">Our dedicated delivery team ensures your food arrives hot within 30 minutes.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-tags"></i></div>
              <h3 className="step-title">Best Prices</h3>
              <p className="step-desc">Restaurant quality food at affordable prices with no hidden charges.</p>
            </div>
            <div className="step-card">
              <div className="step-icon"><i className="fas fa-headset"></i></div>
              <h3 className="step-title">24/7 Support</h3>
              <p className="step-desc">Our customer support team is always available to help with your orders.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
