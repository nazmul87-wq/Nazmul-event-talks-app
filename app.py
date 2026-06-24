import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

def strip_html(html_content):
    """Strips HTML tags to get clean plain text for tweets."""
    if not html_content:
        return ""
    # Replace common block elements with spaces to prevent run-on text
    text = re.sub(r'</?(p|div|li|h3|h4|h5|h6)[^>]*>', ' ', html_content)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_feed():
    """Fetches the RSS feed and parses it into structured JSON."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text.strip()
            updated_str = entry.find('atom:updated', ns).text.strip()
            id_str = entry.find('atom:id', ns).text.strip()
            
            link_el = entry.find('atom:link[@rel="alternate"]', ns)
            if link_el is None:
                link_el = entry.find('atom:link', ns)
            link_str = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ''
            
            # Parse updates by splitting on <h3> tags
            updates = []
            if content_html:
                pattern = r'(<h3>.*?</h3>)'
                parts = re.split(pattern, content_html, flags=re.IGNORECASE)
                
                i = 1
                while i < len(parts):
                    h3_tag = parts[i]
                    body_content = parts[i+1] if i + 1 < len(parts) else ''
                    
                    type_match = re.search(r'<h3>(.*?)</h3>', h3_tag, re.IGNORECASE)
                    update_type = type_match.group(1).strip() if type_match else 'Update'
                    
                    plain_text = strip_html(body_content)
                    
                    updates.append({
                        'type': update_type,
                        'html_content': body_content.strip(),
                        'text_content': plain_text
                    })
                    i += 2
            
            if not updates:
                updates.append({
                    'type': 'Update',
                    'html_content': content_html.strip(),
                    'text_content': strip_html(content_html)
                })
                
            entries.append({
                'date': date_str,
                'updated': updated_str,
                'id': id_str,
                'link': link_str,
                'updates': updates
            })
            
        return entries
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or cache["data"] is None:
        try:
            entries = fetch_feed()
            cache["data"] = entries
        except Exception as e:
            if cache["data"] is not None:
                # Fallback to cache if request fails
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to refresh, showing cached data. Error: {str(e)}",
                    "data": cache["data"]
                })
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch release notes: {str(e)}",
                "data": []
            }), 500
            
    return jsonify({
        "status": "success",
        "data": cache["data"]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
