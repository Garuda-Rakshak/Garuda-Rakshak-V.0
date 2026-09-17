import os
import joblib
import pandas as pd
import shap
from collections import deque
sensor_history = deque(maxlen=5)

# ==============================
# MODEL PATHS
# ==============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FAULT_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "tuned_knn_fault_model.pkl"
)

HEALTH_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "final_health_xgb.pkl"
)

RUL_MODEL_PATH = os.path.join(
    BASE_DIR, "models", "final_rul_xgb.pkl"
)


# ==============================
# LOAD MODELS
# ==============================

fault_model = joblib.load(FAULT_MODEL_PATH)
health_model = joblib.load(HEALTH_MODEL_PATH)
rul_model = joblib.load(RUL_MODEL_PATH)


# ==============================
# PHYSICS MODEL
# ==============================

def expected_egt(rpm, throttle, altitude, ambient_temperature):

    return (
        300
        + 0.025 * rpm
        + 1.2 * throttle
        - 0.005 * altitude
        + 1.5 * ambient_temperature
    )


# ==============================
# FEATURE ENGINEERING
# ==============================

def create_features(sensor_data):

    # Add current sensor reading to history
    sensor_history.append(sensor_data.copy())

    # Convert last 5 readings into DataFrame
    history_df = pd.DataFrame(list(sensor_history))

    df = history_df.copy()

    # ==============================
    # PHYSICS FEATURE
    # ==============================

    df["expected_egt"] = expected_egt(
        df["rpm"],
        df["throttle"],
        df["altitude"],
        df["ambient_temperature"]
    )

    df["egt_residual"] = df["egt"] - df["expected_egt"]

    # ==============================
    # TEMPORAL FEATURES
    # ==============================

    df["rpm_change"] = df["rpm"].diff().fillna(0)

    df["rpm_rolling_mean"] = (
        df["rpm"]
        .rolling(window=5, min_periods=1)
        .mean()
    )

    df["rpm_rolling_std"] = (
        df["rpm"]
        .rolling(window=5, min_periods=1)
        .std()
        .fillna(0)
    )

    df["cht_change"] = df["cht"].diff().fillna(0)

    df["cht_rolling_mean"] = (
        df["cht"]
        .rolling(window=5, min_periods=1)
        .mean()
    )

    df["egt_change"] = df["egt"].diff().fillna(0)

    df["egt_rolling_mean"] = (
        df["egt"]
        .rolling(window=5, min_periods=1)
        .mean()
    )

    df["egt_rolling_std"] = (
        df["egt"]
        .rolling(window=5, min_periods=1)
        .std()
        .fillna(0)
    )

    df["oil_pressure_change"] = (
        df["oil_pressure"].diff().fillna(0)
    )

    df["oil_temperature_change"] = (
        df["oil_temperature"].diff().fillna(0)
    )

    df["fuel_flow_change"] = (
        df["fuel_flow"].diff().fillna(0)
    )

    df["fuel_flow_per_rpm"] = (
        df["fuel_flow"] /
        df["rpm"].replace(0, 1)
    )

    df["vibration_mean"] = (
        df["vibration"]
        .rolling(window=5, min_periods=1)
        .mean()
    )

    df["vibration_std"] = (
        df["vibration"]
        .rolling(window=5, min_periods=1)
        .std()
        .fillna(0)
    )

    df["egt_cht_difference"] = (
        df["egt"] - df["cht"]
    )

    # Return only the latest row
    return df.iloc[[-1]].copy()


# ==============================
# MAINTENANCE ADVISORY
# ==============================

def get_maintenance_action(health, fault):

    if fault == "overheating":
        return "Inspect cooling system and monitor CHT, EGT and oil temperature."

    elif fault == "injector_abnormality":
        return "Inspect fuel injector and monitor fuel flow and EGT."

    elif fault == "lubrication_issue":
        return "Inspect lubrication system and monitor oil pressure and oil temperature."

    elif fault == "abnormal_vibration":
        return "Inspect bearings, rotating components and vibration sources."

    elif fault == "sensor_failure":
        return "Inspect affected sensor, wiring and telemetry."

    if health >= 0.80:
        return "No immediate fault detected. Continue routine monitoring."

    elif health >= 0.60:
        return "Increase monitoring and inspect important sensor trends."

    elif health >= 0.40:
        return "Schedule maintenance inspection before next mission."

    else:
        return "Immediate inspection recommended before further operation."


# ==============================
# HEALTH STATUS
# ==============================

def get_health_status(health):

    if health >= 0.80:
        return "Healthy"

    elif health >= 0.60:
        return "Moderate"

    elif health >= 0.40:
        return "Degraded"

    else:
        return "Critical"

def reset_engine_history():
    sensor_history.clear()
# ==============================
# MAIN AI FUNCTION
# ==============================

def predict_engine(sensor_data):

    # Create ML features
    features = create_features(sensor_data)



    # --------------------------------
    # Select model features
    # --------------------------------

    model_features = [
    "rpm",
    "throttle",
    "altitude",
    "ambient_temperature",
    "cht",
    "egt",
    "oil_pressure",
    "oil_temperature",
    "fuel_flow",
    "vibration",
    "battery_voltage",
    "alternator_current",
    "injection_timing",

    "rpm_change",
    "rpm_rolling_mean",
    "rpm_rolling_std",
    "cht_change",
    "cht_rolling_mean",
    "egt_change",
    "egt_rolling_mean",
    "egt_rolling_std",
    "oil_pressure_change",
    "oil_temperature_change",
    "fuel_flow_change",
    "fuel_flow_per_rpm",
    "vibration_mean",
    "vibration_std",
    "egt_cht_difference",

    "egt_residual"
]

    X = features[model_features]

    # --------------------------------
    # Fault prediction
    # --------------------------------

    predicted_fault = fault_model.predict(X)[0]

    # --------------------------------
    # Health prediction
    # --------------------------------

    predicted_health = float(
        health_model.predict(X)[0]
    )

    predicted_health = max(
        0.0,
        min(1.0, predicted_health)
    )

    # --------------------------------
    # RUL prediction
    # --------------------------------

    predicted_rul = float(
        rul_model.predict(X)[0]
    )

    predicted_rul = max(0, predicted_rul)

    # --------------------------------
    # Health status
    # --------------------------------

    health_status = get_health_status(
        predicted_health
    )

    # --------------------------------
    # Maintenance recommendation
    # --------------------------------

    maintenance_action = get_maintenance_action(
        predicted_health,
        predicted_fault
    )

    # --------------------------------
    # Physics information
    # --------------------------------

    actual_egt = float(features["egt"].iloc[0])
    expected_egt_value = float(
        features["expected_egt"].iloc[0]
    )

    egt_residual = float(
        features["egt_residual"].iloc[0]
    )

    # --------------------------------
    # SHAP explanation
    # --------------------------------

    explainer = shap.TreeExplainer(health_model)

    shap_values = explainer.shap_values(X)

    shap_values = shap_values[0]

    shap_importance = pd.Series(
        shap_values,
        index=model_features
    )

    top_features = (
        shap_importance
        .abs()
        .sort_values(ascending=False)
        .head(5)
    )

    shap_explanation = []

    for feature in top_features.index:

        shap_explanation.append({
            "feature": feature,
            "impact": round(
                float(shap_importance[feature]),
                6
            )
        })

    # --------------------------------
    # Final result
    # --------------------------------

    result = {

        "predicted_fault": str(predicted_fault),

        "predicted_health": round(
            predicted_health,
            3
        ),

        "health_status": health_status,

        "predicted_rul_seconds": round(
            predicted_rul,
            0
        ),

        "actual_egt": round(
            actual_egt,
            2
        ),

        "expected_egt": round(
            expected_egt_value,
            2
        ),

        "egt_residual": round(
            egt_residual,
            2
        ),

        "maintenance_action": maintenance_action,

        "shap_explanation": shap_explanation
    }

    return result