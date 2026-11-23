
import { useState } from "react";

function Admin() {
  const [storeUrl, setStoreUrl] = useState("");
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleConnect = async () => {
    if (!storeUrl.trim()) {
      setMessage("Please enter your store website URL.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSeller(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/stores/connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeUrl: storeUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Store connection failed");
      }

      setSeller(data.seller);
      setMessage(data.message);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f7f4",
      fontFamily: "Arial, sans-serif",
      color: "#29231e"
    }}>
      <header style={{
        background: "#29231e",
        color: "white",
        padding: "22px 5%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h2 style={{ margin: 0, letterSpacing: "3px" }}>
            AURELLE
          </h2>
          <small>SELLER STUDIO</small>
        </div>
        <span>Seller Dashboard</span>
      </header>

      <main style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "0 20px"
      }}>
        <p style={{
          color: "#98764b",
          letterSpacing: "2px"
        }}>
          WELCOME TO AURELLE
        </p>

        <h1>Manage your virtual try-on experience.</h1>

        <p style={{ color: "#777" }}>
          Connect your jewellery store and let customers
          experience your products virtually.
        </p>

        <section style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          marginTop: "35px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
        }}>
          <h2>Connect your store</h2>

          <p style={{ color: "#777" }}>
            Enter your online store website address to get started.
          </p>

          <label htmlFor="storeUrl">
            Store website URL
          </label>

          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "12px",
            flexWrap: "wrap"
          }}>
            <input
              id="storeUrl"
              type="url"
              placeholder="http://localhost:5500"
              value={storeUrl}
              onChange={(e) => {
                setStoreUrl(e.target.value);
                setSeller(null);
                setMessage("");
              }}
              style={{
                flex: 1,
                minWidth: "220px",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "15px"
              }}
            />

            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                padding: "14px 25px",
                background: "#29231e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Connecting..." : "Connect Store"}
            </button>
          </div>

          {message && (
            <p style={{
              color: seller ? "green" : "#c0392b",
              marginTop: "18px"
            }}>
              {message}
            </p>
          )}

          {seller && (
            <div style={{
              marginTop: "20px",
              padding: "18px",
              background: "#f5f8f3",
              borderRadius: "8px"
            }}>
              <h3>Store Connected Successfully ✓</h3>

              <p>
                <strong>Seller ID:</strong>
                <br />
                {seller.sellerId}
              </p>

              <p>
                <strong>Store URL:</strong>
                <br />
                {seller.storeUrl}
              </p>

              <p>
                <strong>Status:</strong> {seller.status}
              </p>
            </div>
          )}
        </section>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "25px"
        }}>
          {[
            ["My Products", "Products imported from your store"],
            ["Virtual Try-On", "Manage jewellery try-on"],
            ["Analytics", "View customer engagement"]
          ].map(([title, description]) => (
            <div key={title} style={{
              background: "white",
              padding: "25px",
              borderRadius: "10px"
            }}>
              <h3>{title}</h3>
              <p style={{
                color: "#777",
                lineHeight: 1.6
              }}>
                {description}
              </p>
              <span style={{ color: "#98764b" }}>
                Coming soon
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Admin;
