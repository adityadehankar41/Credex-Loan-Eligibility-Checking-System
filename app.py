from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from twilio.rest import Client

# # # -------- FASTAPI APP --------
app = FastAPI()

# -------- CORS --------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- LOAD MODEL --------
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
encoder = joblib.load("encoder.pkl")

# -------- TWILIO SETUP --------
account_sid = "id"
auth_token = "token "
client = Client(account_sid, auth_token)

# -------- INPUT MODEL --------
class LoanInput(BaseModel):
    Applicant_Income: float
    Coapplicant_Income: float
    Age: int
    Dependents: int
    Credit_Score: float
    Existing_Loans: int
    DTI_Ratio: float
    Savings: float
    Collateral_Value: float
    Loan_Amount: float
    Loan_Term: int
    Education_Level: int

    Gender: str
    Marital_Status: str
    Employment_Status: str
    Property_Area: str
    Loan_Purpose: str
    Employer_Category: str

    phone: str

# -------- WHATSAPP FUNCTION --------
def send_whatsapp(phone: str, status: int):
    try:
        # ✅ Clean phone FIRST
        phone = ''.join(filter(str.isdigit, str(phone)))

        print("📞 Cleaned Phone:", phone)

        # ❌ Validate AFTER cleaning
        if len(phone) != 10:
            print("❌ Invalid phone number:", phone)
            return

        # ✅ Add country code
        phone = "+91" + phone

        print("✅ Sending to:", phone)

        # ✅ Message
        message_body = (
            "🎉 Your loan is APPROVED! Credex will contact you soon."
            if status == 1
            else "❌ Your loan is NOT approved. Try again later."
        )

        msg = client.messages.create(
            body=message_body,
            from_="whatsapp:+14155238886",
            to=f"whatsapp:{phone}"
        )

        print("✅ WhatsApp sent:", msg.sid)

    except Exception as e:
        print("❌ Twilio Error:", str(e))

# -------- HOME ROUTE --------
@app.post("/predict")
def predict(data: LoanInput):
    try:
        data_dict = data.dict()
        print("🔥 API CALLED")
        # ✅ Extract phone
        phone = data_dict.pop("phone")
        print("📲 Incoming Phone:", phone)

        # ✅ Convert to DataFrame
        df = pd.DataFrame([data_dict])

        # print("Incoming Data:\n", df)

        # -------- CATEGORICAL --------
        cat_cols = list(encoder.feature_names_in_)

        # ✅ Ensure all categorical columns exist
        for col in cat_cols:
            if col not in df.columns:
                df[col] = "Unknown"

        df_cat = df[cat_cols].astype(str)

        # ✅ Transform safely
        encoded = encoder.transform(df_cat)
        encoded_df = pd.DataFrame(
            encoded,
            columns=encoder.get_feature_names_out(cat_cols)
        )

        # -------- NUMERICAL --------
        num_cols = [
            "Applicant_Income", "Coapplicant_Income", "Age",
            "Dependents", "Credit_Score", "Existing_Loans",
            "DTI_Ratio", "Savings", "Collateral_Value",
            "Loan_Amount", "Loan_Term", "Education_Level"
        ]

        # ✅ Fill missing numeric values
        for col in num_cols:
            if col not in df.columns:
                df[col] = 0

        df_num = df[num_cols]

        # -------- FINAL DATA --------
        final_df = pd.concat([df_num, encoded_df], axis=1)

        # ✅ Load correct column order
        columns = joblib.load("columns.pkl")
        final_df = final_df.reindex(columns=columns, fill_value=0)

        print("Final DF before scaling:\n", final_df)

        # -------- SCALING --------
        final_scaled = scaler.transform(final_df)

        # -------- PREDICTION --------
        prediction = model.predict(final_scaled)[0]
        print("Prediction:", prediction)

        # -------- WHATSAPP --------
        # ✅ Validate phone before sending
        send_whatsapp(phone, int(prediction))

        return {
            "prediction": int(prediction),
            "status": "success"
        }

    except Exception as e:
        print("ERROR:", e)
        return {
            "prediction": -1,
            "status": "error",
            "error": str(e)
        }

@app.get("/test-whatsapp")
def test():
    send_whatsapp("7666143179", 1)
    return {"status": "sent"}
class WhatsAppRequest(BaseModel):
    phone: str
    message: str   # ADD THIS

@app.post("/send-whatsapp")
def send_only(data: WhatsAppRequest):
    try:
        phone = ''.join(filter(str.isdigit, data.phone))

        if len(phone) != 10:
            return {"status": "invalid phone"}

        phone = "+91" + phone

        msg = client.messages.create(
            body=data.message,
            from_="whatsapp:+14155238886",
            to=f"whatsapp:{phone}"
        )

        return {"status": "sent"}

    except Exception as e:
        return {"status": "error", "error": str(e)}
@app.middleware("http")
async def log_requests(request, call_next):
    print("👉 Incoming request:", request.method, request.url)
    response = await call_next(request)
    return response