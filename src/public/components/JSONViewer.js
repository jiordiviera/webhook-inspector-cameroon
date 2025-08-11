// Composant JSONViewer pour afficher du JSON avec coloration syntaxique
class JSONViewer {
  
  // Colorier un objet JSON dans un élément
  static highlight(element, jsonData) {
    if (!element) return;
    
    let jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    
    // Échapper le HTML
    jsonString = this.escapeHtml(jsonString);
    
    // Colorier les différents éléments
    jsonString = this.colorizeJSON(jsonString);
    
    element.innerHTML = jsonString;
  }
  
  // Créer un viewer JSON expandable
  static createViewer(jsonData, options = {}) {
    const {
      collapsed = false,
      maxDepth = Infinity,
      showLineNumbers = true,
      theme = 'dark'
    } = options;
    
    const container = document.createElement('div');
    container.className = `json-viewer-container theme-${theme}`;
    
    if (showLineNumbers) {
      container.classList.add('with-line-numbers');
    }
    
    const content = this.renderObject(jsonData, 0, maxDepth, collapsed);
    container.innerHTML = content;
    
    // Ajouter les événements pour expand/collapse
    this.addInteractivity(container);
    
    return container;
  }
  
  static renderObject(obj, depth = 0, maxDepth = Infinity, collapsed = false) {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    
    if (obj === null) {
      return `<span class="json-null">null</span>`;
    }
    
    if (typeof obj === 'boolean') {
      return `<span class="json-boolean">${obj}</span>`;
    }
    
    if (typeof obj === 'number') {
      return `<span class="json-number">${obj}</span>`;
    }
    
    if (typeof obj === 'string') {
      // Détecter et colorier différents types de chaînes
      const coloredString = this.colorizeString(obj);
      return `<span class="json-string">"${coloredString}"</span>`;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '<span class="json-bracket">[]</span>';
      }
      
      if (depth >= maxDepth) {
        return `<span class="json-collapsed" data-type="array" data-length="${obj.length}">[...] (${obj.length} items)</span>`;
      }
      
      const isCollapsed = collapsed && depth > 0;
      const toggleClass = isCollapsed ? 'collapsed' : 'expanded';
      
      let result = `<span class="json-bracket json-toggle ${toggleClass}" data-type="array">[</span>`;
      
      if (!isCollapsed) {
        result += '\n';
        obj.forEach((item, index) => {
          result += nextIndent;
          result += this.renderObject(item, depth + 1, maxDepth, collapsed);
          if (index < obj.length - 1) {
            result += ',';
          }
          result += '\n';
        });
        result += indent;
      } else {
        result += ` <span class="json-collapsed-indicator">... ${obj.length} items</span> `;
      }
      
      result += '<span class="json-bracket">]</span>';
      return result;
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      
      if (keys.length === 0) {
        return '<span class="json-bracket">{}</span>';
      }
      
      if (depth >= maxDepth) {
        return `<span class="json-collapsed" data-type="object" data-length="${keys.length}">{...} (${keys.length} keys)</span>`;
      }
      
      const isCollapsed = collapsed && depth > 0;
      const toggleClass = isCollapsed ? 'collapsed' : 'expanded';
      
      let result = `<span class="json-bracket json-toggle ${toggleClass}" data-type="object">{</span>`;
      
      if (!isCollapsed) {
        result += '\n';
        keys.forEach((key, index) => {
          result += nextIndent;
          result += `<span class="json-key">"${key}"</span>: `;
          result += this.renderObject(obj[key], depth + 1, maxDepth, collapsed);
          if (index < keys.length - 1) {
            result += ',';
          }
          result += '\n';
        });
        result += indent;
      } else {
        result += ` <span class="json-collapsed-indicator">... ${keys.length} keys</span> `;
      }
      
      result += '<span class="json-bracket">}</span>';
      return result;
    }
    
    return String(obj);
  }
  
  static colorizeString(str) {
    // URLs
    if (str.match(/^https?:\/\//)) {
      return `<span class="json-url">${str}</span>`;
    }
    
    // Emails
    if (str.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return `<span class="json-email">${str}</span>`;
    }
    
    // Dates ISO
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return `<span class="json-date">${str}</span>`;
    }
    
    // UUIDs
    if (str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return `<span class="json-uuid">${str}</span>`;
    }
    
    // Numéros de téléphone camerounais
    if (CameroonUtils.isPhoneCameroon(str)) {
      return `<span class="json-phone-cm">🇨🇲 ${str}</span>`;
    }
    
    // Montants FCFA
    if (CameroonUtils.detectFCFA(str)) {
      return `<span class="json-amount">💰 ${str}</span>`;
    }
    
    return this.escapeHtml(str);
  }
  
  static colorizeJSON(jsonString) {
    // Colorer les clés
    jsonString = jsonString.replace(/\"([^\"]+)\"(\s*:)/g, '<span class="json-key">"$1"</span>$2');
    
    // Colorer les chaînes (mais pas les clés déjà colorées)
    jsonString = jsonString.replace(/:\s*\"([^\"]*)\"/g, (match, value) => {
      const coloredValue = this.colorizeString(value);
      return `: <span class="json-string">"${coloredValue}"</span>`;
    });
    
    // Colorer les nombres
    jsonString = jsonString.replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
    
    // Colorer les booléens
    jsonString = jsonString.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');
    
    // Colorer null
    jsonString = jsonString.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
    
    // Colorer les crochets et accolades
    jsonString = jsonString.replace(/[\[\]{}]/g, '<span class="json-bracket">$&</span>');
    
    return jsonString;
  }
  
  static addInteractivity(container) {
    container.addEventListener('click', (e) => {
      const toggle = e.target.closest('.json-toggle');
      if (!toggle) return;
      
      e.stopPropagation();
      
      if (toggle.classList.contains('collapsed')) {
        toggle.classList.remove('collapsed');
        toggle.classList.add('expanded');
        this.expandToggle(toggle);
      } else if (toggle.classList.contains('expanded')) {
        toggle.classList.remove('expanded');
        toggle.classList.add('collapsed');
        this.collapseToggle(toggle);
      }
    });
  }
  
  static expandToggle(toggle) {
    // Logique pour déplier (à implémenter selon le besoin)
  }
  
  static collapseToggle(toggle) {
    // Logique pour plier (à implémenter selon le besoin)
  }
  
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Fonction utilitaire pour formater du JSON dans un élément existant
  static format(elementOrSelector, jsonData, options = {}) {
    const element = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;
    
    if (!element) return;
    
    const viewer = this.createViewer(jsonData, options);
    element.innerHTML = '';
    element.appendChild(viewer);
  }
}

// Styles CSS pour le JSON Viewer
const jsonViewerStyles = `
<style>
.json-viewer-container {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.4;
  background: var(--gray-900);
  color: var(--white);
  padding: 1rem;
  border-radius: var(--border-radius);
  overflow-x: auto;
  white-space: pre;
}

.json-viewer-container.theme-light {
  background: var(--white);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.json-key {
  color: #79B8FF;
  font-weight: 500;
}

.json-string {
  color: #B392F0;
}

.json-number {
  color: #79B8FF;
}

.json-boolean {
  color: #FFAB70;
  font-weight: bold;
}

.json-null {
  color: #F97583;
  font-style: italic;
}

.json-bracket {
  color: #E1E4E8;
  font-weight: bold;
}

.json-url {
  color: #58A6FF;
  text-decoration: underline;
}

.json-email {
  color: #F2CC60;
}

.json-date {
  color: #A5A5A5;
  background: rgba(165, 165, 165, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
}

.json-uuid {
  color: #D2A8FF;
  font-size: 0.8em;
}

.json-phone-cm {
  color: var(--cameroon-green);
  background: rgba(15, 123, 15, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: bold;
}

.json-amount {
  color: var(--cameroon-yellow);
  background: rgba(255, 205, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: bold;
}

.json-toggle {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.json-toggle:hover {
  opacity: 0.8;
}

.json-toggle::before {
  content: '▼';
  display: inline-block;
  margin-right: 0.25rem;
  font-size: 0.7em;
  transition: transform 0.2s ease;
}

.json-toggle.collapsed::before {
  transform: rotate(-90deg);
}

.json-collapsed-indicator {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.8em;
}

.json-collapsed {
  color: var(--text-muted);
  cursor: pointer;
}

.json-collapsed:hover {
  color: var(--text-secondary);
}

/* Numéros de ligne */
.json-viewer-container.with-line-numbers {
  position: relative;
  padding-left: 3rem;
}

.json-viewer-container.with-line-numbers::before {
  content: counter(line);
  counter-increment: line;
  position: absolute;
  left: 0;
  width: 2.5rem;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.75rem;
  pointer-events: none;
}

/* Responsive */
@media (max-width: 768px) {
  .json-viewer-container {
    font-size: 0.75rem;
    padding: 0.75rem;
  }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', jsonViewerStyles);