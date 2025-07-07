import streamlit as st

st.set_page_config(page_title="SWNA Tools", layout="centered")

st.title("SWNA Tools")

tool = st.sidebar.radio(
    "Choose a tool",
    [
        "Create EN-16",
        "Create EE-10",
        "Create IR Schedule Notice La Plata",
        "Create RD Accept Waiver",
        "Create Invoice",
    ],
)

if tool == "Create EN-16":
    from streamlit_views.en16 import render_en16

    render_en16()

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
