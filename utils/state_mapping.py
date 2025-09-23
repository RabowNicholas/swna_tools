"""
Utility for converting full state names to 2-letter abbreviations
"""

# Comprehensive mapping of US state names to abbreviations
STATE_NAME_TO_ABBR = {
    "Alabama": "AL",
    "Alaska": "AK", 
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY",
    "District of Columbia": "DC",
    "Puerto Rico": "PR",
    "Virgin Islands": "VI",
    "American Samoa": "AS",
    "Guam": "GU",
    "Northern Mariana Islands": "MP"
}

def get_state_abbreviation(state_name: str) -> str:
    """
    Convert a full state name to its 2-letter abbreviation
    
    Args:
        state_name: Full state name (e.g., "California", "New York")
    
    Returns:
        str: 2-letter state abbreviation (e.g., "CA", "NY") or original string if not found
    """
    if not state_name:
        return ""
    
    # Check exact match first
    if state_name in STATE_NAME_TO_ABBR:
        return STATE_NAME_TO_ABBR[state_name]
    
    # Check case-insensitive match
    for full_name, abbr in STATE_NAME_TO_ABBR.items():
        if state_name.lower() == full_name.lower():
            return abbr
    
    # If it's already an abbreviation (2 letters), return as-is
    if len(state_name) == 2 and state_name.isalpha():
        return state_name.upper()
    
    # Return original string if no match found
    return state_name