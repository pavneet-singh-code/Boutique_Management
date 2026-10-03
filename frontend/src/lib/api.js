const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export async function login(password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Login failed");
    }

    return data;
}

export async function getOrders() {
    const token = sessionStorage.getItem("fab_art_token");

    const response = await fetch(`${API_URL}/orders`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            sessionStorage.removeItem("fab_art_token");
            throw new Error("Session expired. Please login again.");
        }

        throw new Error("Failed to fetch orders");
    }

    return response.json();
}

export async function analyzeOrderPdf(file) {
    const token = sessionStorage.getItem("fab_art_token");

    if (!token) {
        throw new Error("You are not logged in.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/analyze-order-pdf`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            sessionStorage.removeItem("fab_art_token");
            throw new Error("Session expired. Please login again.");
        }

        throw new Error(data.detail || "Failed to analyze PDF");
    }

    return data;
}

export function logout() {
    sessionStorage.removeItem("fab_art_token");
}

export async function saveOrders(orders) {
    const token = sessionStorage.getItem("fab_art_token");

    if (!token) {
        throw new Error("You are not logged in.");
    }

    const response = await fetch(`${API_URL}/orders/bulk-save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orders),
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            sessionStorage.removeItem("fab_art_token");
            throw new Error("Session expired. Please login again.");
        }

        throw new Error(data.detail || "Failed to save orders");
    }

    return data;
}
