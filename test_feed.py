import urllib.request
import xml.etree.ElementTree as ET
import re

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
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
            
            # Split the HTML content by <h3> to extract individual updates
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
                    
                    updates.append({
                        'type': update_type,
                        'html_content': body_content.strip()
                    })
                    i += 2
            
            if not updates:
                updates.append({
                    'type': 'Update',
                    'html_content': content_html.strip()
                })
                
            entries.append({
                'date': date_str,
                'updated': updated_str,
                'id': id_str,
                'link': link_str,
                'updates': updates
            })
            
        print(f"Parsed {len(entries)} entries successfully.")
        if entries:
            print("\nFirst Entry sample:")
            print("Date:", entries[0]['date'])
            print("Link:", entries[0]['link'])
            print("Number of sub-updates:", len(entries[0]['updates']))
            for idx, upd in enumerate(entries[0]['updates']):
                print(f"  Sub-update {idx+1} Type:", upd['type'])
                print(f"  Sub-update {idx+1} Snippet:", upd['html_content'][:150] + "...")
                
    except Exception as e:
        print("Error during fetch/parse:", e)

if __name__ == "__main__":
    fetch_and_parse_feed()
