import os
import joblib
import pandas as pd
from collections import deque

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")

FAULT_MODEL_PATH = os.path.join(MODELS_DIR, "tuned_knn_fault_model.pkl")
MULTIFAULT_MODEL_PATH = os.path.join(MODELS_DIR, "multifault_knn_v2.pkl")
MULTIFAULT_SCALER_PATH = os.path.join(MODELS_DIR, "multifault_scaler_v2.pkl")
HEALTH_MODEL_PATH = os.path.join(MODELS_DIR, "final_health_xgb.pkl")
RUL_MODEL_PATH = os.path.join(MODELS_DIR, "final_rul_xgb.pkl")

# Load models
fault_model = joblib.load(FAULT_MODEL_PATH) if os.path.exists(FAULT_MODEL_PATH) else None
multifault_model = joblib.load(MULTIFAULT_MODEL_PATH) if os.path.exists(MULTIFAULT_MODEL_PATH) else None
multifault_scaler = joblib.load(MULTIFAULT_SCALER_PATH) if os.path.exists(MULTIFAULT_SCALER_PATH) else None
health_model = joblib.load(HEALTH_MODEL_PATH) if os.path.exists(HEALTH_MODEL_PATH) else None
rul_model = joblib.load(RUL_MODEL_PATH) if os.path.exists(RUL_MODEL_PATH) else None


# --------------------------------------------------
# Physics model
# --------------------------------------------------

def expected_egt(rpm, throttle, altitude, ambient_temperature):

    return (
        300
        + 0.025 * rpm
        + 1.2 * throttle
        - 0.005 * altitude
        + 1.5 * ambient_temperature
    )


# --------------------------------------------------
# Feature engineering
# --------------------------------------------------

sensor_history = deque(maxlen=5)


def create_features(sensor_data):

    sensor_history.append(sensor_data.copy())

    history_df = pd.DataFrame(list(sensor_history))

    df = history_df.copy()

    df["expected_egt"] = expected_egt(
        df["rpm"],
        df["throttle"],
        df["altitude"],
        df["ambient_temperature"]
    )

    df["egt_residual"] = (
        df["egt"] - df["expected_egt"]
    )

    df["rpm_change"] = df["rpm"].diff().fillna(0)

    df["rpm_rolling_mean"] = (
        df["rpm"].rolling(window=5, min_periods=1).mean()
    )

    df["rpm_rolling_std"] = (
        df["rpm"].rolling(window=5, min_periods=1)
        .std()
        .fillna(0)
    )

    df["cht_change"] = df["cht"].diff().fillna(0)

    df["cht_rolling_mean"] = (
        df["cht"].rolling(window=5, min_periods=1).mean()
    )

    df["egt_change"] = df["egt"].diff().fillna(0)

    df["egt_rolling_mean"] = (
        df["egt"].rolling(window=5, min_periods=1).mean()
    )

    df["egt_rolling_std"] = (
        df["egt"].rolling(window=5, min_periods=1)
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
        df["vibration"].rolling(window=5, min_periods=1).mean()
    )

    df["vibration_std"] = (
        df["vibration"].rolling(window=5, min_periods=1)
        .std()
        .fillna(0)
    )

    df["egt_cht_difference"] = (
        df["egt"] - df["cht"]
    )

    return df.iloc[[-1]].copy()


# --------------------------------------------------
# Health status
# --------------------------------------------------

def get_health_status(health):

    if health >= 0.80:
        return "Healthy"

    elif health >= 0.60:
        return "Moderate"

    elif health >= 0.40:
        return "Degraded"

    else:
        return "Critical"


# --------------------------------------------------
# Multi-fault description
# --------------------------------------------------

FAULT_NAMES = {
    "overheating": "Overheating",
    "injector_abnormality": "Injector Abnormality",
    "lubrication_issue": "Lubrication Issue",
    "abnormal_vibration": "Abnormal Vibration",
    "sensor_failure": "Sensor Failure"
}


def get_fault_description(detected_faults):

    if not detected_faults:
        return "Engine operating normally."

    names = [
        FAULT_NAMES[fault]
        for fault in detected_faults
    ]

    if len(names) == 1:
        return f"{names[0]} detected."

    return (
        "Multiple simultaneous engine abnormalities detected: "
        + ", ".join(names)
        + "."
    )


# --------------------------------------------------
# Maintenance advisory
# --------------------------------------------------

def get_maintenance_action(
    health,
    detected_faults
):

    actions = []

    if "overheating" in detected_faults:
        actions.append(
            "Inspect cooling system and monitor CHT, EGT and oil temperature."
        )

    if "injector_abnormality" in detected_faults:
        actions.append(
            "Inspect fuel injector and monitor fuel flow and EGT."
        )

    if "lubrication_issue" in detected_faults:
        actions.append(
            "Inspect lubrication system and monitor oil pressure and oil temperature."
        )

    if "abnormal_vibration" in detected_faults:
        actions.append(
            "Inspect bearings, rotating components and vibration sources."
        )

    if "sensor_failure" in detected_faults:
        actions.append(
            "Inspect affected sensor, wiring and telemetry."
        )

    if actions:
        return " ".join(actions)

    if health >= 0.80:
        return (
            "No immediate fault detected. "
            "Continue routine monitoring."
        )

    elif health >= 0.60:
        return (
            "Increase monitoring and inspect important "
            "sensor trends."
        )

    elif health >= 0.40:
        return (
            "Schedule maintenance inspection "
            "before next mission."
        )

    else:
        return (
            "Immediate inspection recommended "
            "before further operation."
        )


# --------------------------------------------------
# Reset history
# --------------------------------------------------

def reset_engine_history():
    sensor_history.clear()


# --------------------------------------------------
# Main AI prediction
# --------------------------------------------------

def predict_engine(sensor_data):

    features = create_features(sensor_data)

    # ----------------------------------------------
    # Multi-fault prediction
    # ----------------------------------------------

    multifault_features = [
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
        "injection_timing"
    ]

    X_multifault = features[multifault_features]

    X_multifault_scaled = (
        multifault_scaler.transform(X_multifault)
    )

    multifault_prediction = (
        multifault_model.predict(X_multifault_scaled)[0]
    )

    detected_faults = [
        fault
        for fault, value in zip(
            [
                "overheating",
                "injector_abnormality",
                "lubrication_issue",
                "abnormal_vibration",
                "sensor_failure"
            ],
            multifault_prediction
        )
        if value == 1
    ]

    # ----------------------------------------------
    # Existing single-fault model
    # ----------------------------------------------

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

    # Existing single fault
    predicted_fault = fault_model.predict(X)[0]

    # ----------------------------------------------
    # Health
    # ----------------------------------------------

    predicted_health = float(
        health_model.predict(X)[0]
    )

    predicted_health = max(
        0.0,
        min(1.0, predicted_health)
    )

    # ----------------------------------------------
    # RUL
    # ----------------------------------------------

    predicted_rul = float(
        rul_model.predict(X)[0]
    )

    predicted_rul = max(
        0,
        predicted_rul
    )

    health_status = get_health_status(
        predicted_health
    )

    # ----------------------------------------------
    # Physics
    # ----------------------------------------------

    actual_egt = float(
        features["egt"].iloc[0]
    )

    expected_egt_value = float(
        features["expected_egt"].iloc[0]
    )

    egt_residual = float(
        features["egt_residual"].iloc[0]
    )

        # ----------------------------------------------
    # SHAP
    # ----------------------------------------------
    try:
        import shap

        explainer = shap.TreeExplainer(health_model)

        shap_values = explainer.shap_values(X)

        if hasattr(shap_values, "__len__") and len(shap_values) > 0:
            shap_values = shap_values[0]

        shap_importance = pd.Series(
            shap_values,
            index=model_features
        )

        top_features = (
            shap_importance.abs()
            .sort_values(ascending=False)
            .head(5)
        )

        shap_explanation = []

        for feature in top_features.index:
            shap_explanation.append(
                {
                    "feature": feature,
                    "impact": round(
                        float(shap_importance[feature]),
                        6
                    )
                }
            )

    except Exception:
        shap_explanation = [
            {
                "feature": "SHAP unavailable",
                "impact": 0.0
            }
        ]


    # ----------------------------------------------
    # Fault description
    # ----------------------------------------------

    fault_description = get_fault_description(
        detected_faults
    )

    # ----------------------------------------------
    # Maintenance
    # ----------------------------------------------

    maintenance_action = get_maintenance_action(
        predicted_health,
        detected_faults
    )

    # ----------------------------------------------
    # Final result
    # ----------------------------------------------

    result = {

        "predicted_fault": str(
            predicted_fault
        ),

        "detected_faults": detected_faults,

        "fault_description": fault_description,

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

        "maintenance_action":
            maintenance_action,

        "shap_explanation":
            shap_explanation
    }

    return result