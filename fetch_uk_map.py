import urllib.request
import json
import os

url = "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson"
output_file = "public/uttarakhand_districts.json"

try:
    print("Downloading India districts GeoJSON...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    print("Filtering for Uttarakhand...")
    uk_features = []
    for feature in data.get('features', []):
        props = feature.get('properties', {})
        # Different datasets use different keys for state name
        state_name = props.get('NAME_1') or props.get('st_nm') or props.get('ST_NM')
        if state_name and state_name.lower() in ['uttarakhand', 'uttaranchal']:
            uk_features.append(feature)
            
    if not uk_features:
        print("Could not find Uttarakhand in this dataset. Let's try another source.")
        # Try another popular source
        url2 = "https://raw.githubusercontent.com/datameet/maps/master/Districts/Census_2011/2011_Dist.geojson"
        print("Downloading from datameet...")
        req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req2) as response2:
            data2 = json.loads(response2.read().decode())
        for feature in data2.get('features', []):
            props = feature.get('properties', {})
            state_name = props.get('ST_NM')
            if state_name and state_name.lower() in ['uttarakhand', 'uttaranchal']:
                uk_features.append(feature)
                
    if uk_features:
        uk_geojson = {
            "type": "FeatureCollection",
            "features": uk_features
        }
        
        # Ensure public directory exists
        os.makedirs('public', exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(uk_geojson, f)
        
        print(f"Successfully saved {len(uk_features)} districts to {output_file}")
    else:
        print("Failed to find Uttarakhand districts.")
        
except Exception as e:
    print(f"Error: {e}")
