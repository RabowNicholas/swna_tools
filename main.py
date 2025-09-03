import streamlit as st
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(page_title="SWNA Tools", layout="centered")

st.title("SWNA Tools")

tool = st.sidebar.radio(
    "Choose a tool",
    [
        "Access Portal",
        "Create EN-16",
        "Create EE-1",
        "Create EE-1a",
        "Create EE-3",
        "Create EE-10",
        "Create IR Schedule Notice La Plata",
        "Create RD Accept Waiver",
        "Create Invoice",
        "Create Desert Pulmonary Referral",
        "Create Withdrawal Letter",
        "Create Address Change Letter",
    ],
)

if tool == "Create EN-16":
    from streamlit_views.en16 import render_en16

    render_en16()

elif tool == "Create EE-1":
    from streamlit_views.ee1 import render_ee1

    render_ee1()

elif tool == "Create EE-1a":
    from streamlit_views.ee1a import render_ee1a

    render_ee1a()

elif tool == "Create EE-3":
    st.title("🏗️ EE-3 Form Generator")
    st.info("🚧 **Coming Soon!** The EE-3 Employment History form is currently under development.")
    st.markdown("""
    **EE-3 Form Features (In Development):**
    - 📋 Comprehensive employment history tracking
    - 🏭 Multiple facility types and locations
    - 📊 Health program participation tracking
    - 📑 Multi-page PDF generation
    - ✍️ Digital signature support
    
    This form will be available in an upcoming release.
    """)

elif tool == "Create EE-10":
    from streamlit_views.ee10 import render_ee10

    render_ee10()

elif tool == "Create RD Accept Waiver":
    from streamlit_views.rd_waiver import render_rd_waiver

    render_rd_waiver()

elif tool == "Create Invoice":
    from streamlit_views.invoice import render_invoice

    render_invoice()

elif tool == "Create IR Schedule Notice La Plata":
    from streamlit_views.ir_notice_la_plata import render_ir_notice_la_plata

    render_ir_notice_la_plata()

elif tool == "Create Desert Pulmonary Referral":
    from streamlit_views.desert_pulm_referral import render_desert_pulm_referral

    render_desert_pulm_referral()

elif tool == "Create Withdrawal Letter":
    from streamlit_views.withdrawal_letter import render_withdrawal_letter

    render_withdrawal_letter()

elif tool == "Create Address Change Letter":
    from streamlit_views.address_change import render_address_change

    render_address_change()

elif tool == "Access Portal":
    from streamlit_views.portal_access import render_portal_access

    render_portal_access()
