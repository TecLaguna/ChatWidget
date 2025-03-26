// chatWidget.js - Versión mejorada

class ChatWidget {
  constructor(options = {}) {
    // Configuración predeterminada
    this.config = {
      apiUrl: options.apiUrl || 'ws://localhost:8000/ws',
      position: options.position || 'bottom-right',
      primaryColor: options.primaryColor || '#4a6baf',
      title: options.title || 'Chat Assistant',
      greeting: options.greeting || 'Hola! ¿Cómo puedo ayudarte hoy?',
      reconnectInterval: options.reconnectInterval || 5000,
      responseTimeout: options.responseTimeout || 15000
    };
    
    this.isOpen = false;
    this.conversationName = `conversation_${Date.now()}`;
    this.socket = null;
    this.loadingIndicator = null;
    this.responseTimeout = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageQueue = [];
    
    this.createWidget();
    this.setupEventListeners();
    this.connectWebSocket();
    this.addCustomStyles();
  }

  createWidget() {
    // Crear contenedor principal
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.style.position = 'fixed';
    this.widgetContainer.style.bottom = '20px';
    this.widgetContainer.style.right = this.config.position === 'bottom-right' ? '20px' : 'auto';
    this.widgetContainer.style.left = this.config.position === 'bottom-left' ? '20px' : 'auto';
    this.widgetContainer.style.zIndex = '1000';
    this.widgetContainer.style.fontFamily = 'Arial, sans-serif';
    this.widgetContainer.style.transition = 'all 0.3s ease';
    
    // Crear botón de chat
    this.chatButton = document.createElement('div');
    this.chatButton.style.width = '60px';
    this.chatButton.style.height = '60px';
    this.chatButton.style.borderRadius = '50%';
    this.chatButton.style.backgroundColor = this.config.primaryColor;
    this.chatButton.style.color = 'white';
    this.chatButton.style.display = 'flex';
    this.chatButton.style.justifyContent = 'center';
    this.chatButton.style.alignItems = 'center';
    this.chatButton.style.cursor = 'pointer';
    this.chatButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    this.chatButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    
    // Crear caja de chat
    this.chatBox = document.createElement('div');
    this.chatBox.style.width = '350px';
    this.chatBox.style.height = '500px';
    this.chatBox.style.backgroundColor = 'white';
    this.chatBox.style.borderRadius = '8px';
    this.chatBox.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    this.chatBox.style.display = 'none';
    this.chatBox.style.flexDirection = 'column';
    this.chatBox.style.overflow = 'hidden';
    
    // Crear encabezado del chat
    const chatHeader = document.createElement('div');
    chatHeader.style.padding = '15px';
    chatHeader.style.backgroundColor = this.config.primaryColor;
    chatHeader.style.color = 'white';
    chatHeader.style.display = 'flex';
    chatHeader.style.justifyContent = 'space-between';
    chatHeader.style.alignItems = 'center';
    chatHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div id="connectionStatus" style="width: 10px; height: 10px; border-radius: 50%; background-color: #ccc;"></div>
        <h3 style="margin: 0; font-size: 16px;">${this.config.title}</h3>
      </div>
      <button id="closeChat" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
    `;
    
    // Crear contenedor de mensajes
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.style.flex = '1';
    this.messagesContainer.style.padding = '15px';
    this.messagesContainer.style.overflowY = 'auto';
    this.messagesContainer.style.display = 'flex';
    this.messagesContainer.style.flexDirection = 'column';
    this.messagesContainer.style.gap = '10px';
    
    // Crear área de entrada
    const inputArea = document.createElement('div');
    inputArea.style.padding = '10px';
    inputArea.style.borderTop = '1px solid #eee';
    inputArea.style.display = 'flex';
    inputArea.style.gap = '10px';
    
    this.messageInput = document.createElement('input');
    this.messageInput.style.flex = '1';
    this.messageInput.style.padding = '10px';
    this.messageInput.style.border = '1px solid #ddd';
    this.messageInput.style.borderRadius = '4px';
    this.messageInput.style.outline = 'none';
    this.messageInput.placeholder = 'Escribe tu mensaje...';
    
    const sendButton = document.createElement('button');
    sendButton.style.padding = '10px 15px';
    sendButton.style.backgroundColor = this.config.primaryColor;
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.textContent = 'Enviar';
    
    inputArea.appendChild(this.messageInput);
    inputArea.appendChild(sendButton);
    
    // Ensamblar la caja de chat
    this.chatBox.appendChild(chatHeader);
    this.chatBox.appendChild(this.messagesContainer);
    this.chatBox.appendChild(inputArea);
    
    // Agregar elementos al contenedor
    this.widgetContainer.appendChild(this.chatBox);
    this.widgetContainer.appendChild(this.chatButton);
    
    // Agregar al cuerpo del documento
    document.body.appendChild(this.widgetContainer);
    
    // Agregar mensaje de bienvenida
    this.addMessage(this.config.greeting, false);
    
    // Elemento de estado de conexión
    this.connectionStatus = this.widgetContainer.querySelector('#connectionStatus');
  }

  connectWebSocket() {
    // Cerrar conexión existente si hay una
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    
    this.updateConnectionStatus('connecting');
    
    this.socket = new WebSocket(this.config.apiUrl);
    
    this.socket.onopen = () => {
      console.log('Conexión WebSocket establecida');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      this.addSystemMessage('Conectado al servidor');
      
      // Procesar cola de mensajes pendientes
      this.processMessageQueue();
    };
    
    this.socket.onclose = (event) => {
      console.log('Conexión WebSocket cerrada', event);
      this.updateConnectionStatus('disconnected');
      
      if (!event.wasClean) {
        this.addSystemMessage('Conexión perdida. Intentando reconectar...');
        this.handleReconnection();
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      this.updateConnectionStatus('error');
      this.addSystemMessage('Error de conexión');
    };
    
    this.socket.onmessage = (event) => {
      this.handleIncomingMessage(event);
    };
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.addSystemMessage(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      this.addSystemMessage('No se pudo reconectar. Por favor recarga la página.');
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendSocketMessage(message);
    }
  }

  sendSocketMessage(messageData) {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(messageData));
      } else {
        this.messageQueue.push(messageData);
        if (this.socket.readyState === WebSocket.CLOSED) {
          this.connectWebSocket();
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      this.addSystemMessage('Error al enviar el mensaje. Por favor intenta nuevamente.');
    }
  }

  handleIncomingMessage(event) {
    try {
      // Limpiar timeout de respuesta
      clearTimeout(this.responseTimeout);
      
      // Parsear la respuesta del servidor
      const response = JSON.parse(event.data);
      
      if (response.response) {
        // Mostrar la respuesta del asistente
        this.addMessage(response.response, false);
      } else if (response.error) {
        // Mostrar mensaje de error
        this.addSystemMessage(`Error: ${response.error}`);
      }
    } catch (e) {
      console.error('Error al parsear mensaje:', e);
      // Si no es JSON, mostrar el mensaje directamente
      this.addMessage(event.data, false);
    }
    
    // Ocultar indicador de carga
    if (this.loadingIndicator) {
      this.loadingIndicator.remove();
      this.loadingIndicator = null;
    }
  }

  setupEventListeners() {
    // Alternar visibilidad del chat
    this.chatButton.addEventListener('click', () => this.toggleChat());
    this.widgetContainer.querySelector('#closeChat').addEventListener('click', () => this.toggleChat());
    
    // Enviar mensaje al hacer clic en el botón
    this.widgetContainer.querySelector('button').addEventListener('click', () => this.sendMessage());
    
    // Enviar mensaje al presionar Enter
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.chatBox.style.display = this.isOpen ? 'flex' : 'none';
    this.chatButton.style.display = this.isOpen ? 'none' : 'flex';
    
    if (this.isOpen) {
      this.messageInput.focus();
      // Desplazarse al final de los mensajes
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 100);
    }
  }

  addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .price-section {
        margin-bottom: 12px;
      }
      
      .price-title {
        font-weight: bold;
        font-size: 1.1em;
        margin: 10px 0 5px 0;
        color: ${this.config.primaryColor};
      }
      
      .price-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        padding-left: 8px;
        position: relative;
      }
      
      .price-item::before {
        content: "•";
        position: absolute;
        left: 0;
      }
      
      .price-value {
        font-weight: bold;
        color: ${this.config.primaryColor};
        margin-left: 10px;
      }
    `;
    document.head.appendChild(style);
  }
  
  addMessage(content, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.style.maxWidth = '85%';
    messageElement.style.padding = '12px 16px';
    messageElement.style.borderRadius = '12px';
    messageElement.style.wordBreak = 'break-word';
    messageElement.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    messageElement.style.backgroundColor = isUser ? this.config.primaryColor : '#f5f5f5';
    messageElement.style.color = isUser ? 'white' : '#333';
    messageElement.style.animation = 'fadeIn 0.3s ease';
    messageElement.style.marginBottom = '8px';
    messageElement.style.boxShadow = isUser ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)';
  
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div style="font-weight: ${isUser ? 'bold' : '600'}; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span>${isUser ? 'Tú' : 'Asistente'}</span>
        <span style="font-size: 0.75em; opacity: 0.7;">${timestamp}</span>
      </div>
      <div style="line-height: 1.5;">${this.formatContent(content)}</div>
    `;
  
    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  formatContent(content) {
    if (!content.includes('**') || !content.includes('$')) {
      return content;
    }
  
    const lines = content.split('\n');
    let htmlContent = '';
    let currentSection = '';
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('**') && line.endsWith('**')) {
        if (currentSection) {
          htmlContent += `</div>`;
        }
        const sectionTitle = line.replace(/\*\*/g, '').trim();
        htmlContent += `
          <div class="price-section">
            <div class="price-title">${sectionTitle}</div>
        `;
        currentSection = sectionTitle;
      } else if (line.includes('-') && line.includes('$')) {
        const parts = line.split('-');
        const itemText = parts.slice(1).join('-').split('$')[0].trim();
        const price = line.split('$')[1].split(' ')[0].trim();
        htmlContent += `
          <div class="price-item">
            <span>${itemText}</span>
            <span class="price-value">$${price}</span>
          </div>
        `;
      } else {
        htmlContent += `<div style="margin-bottom: 4px;">${line}</div>`;
      }
    });
    
    if (currentSection) {
      htmlContent += `</div>`;
    }
    
    return htmlContent || content;
  }

  addSystemMessage(content) {
    // Eliminar el indicador de carga existente si hay uno
    if (this.loadingIndicator) {
      this.loadingIndicator.remove();
    }
    
    const messageElement = document.createElement('div');
    messageElement.style.width = '100%';
    messageElement.style.padding = '8px';
    messageElement.style.textAlign = 'center';
    messageElement.style.color = '#666';
    messageElement.style.fontSize = '0.8em';
    messageElement.style.fontStyle = 'italic';
    messageElement.textContent = content;
    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    // Guardar referencia si es un indicador de carga
    if (content.includes('Procesando')) {
      this.loadingIndicator = messageElement;
    }
  }

  updateConnectionStatus(status) {
    const statusColors = {
      connected: '#4CAF50',
      connecting: '#FFC107',
      disconnected: '#F44336',
      error: '#F44336'
    };
    
    if (this.connectionStatus) {
      this.connectionStatus.style.backgroundColor = statusColors[status] || '#9E9E9E';
    }
  }

  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;
    
    // Mostrar el mensaje del usuario
    this.addMessage(message, true);
    this.messageInput.value = '';
    
    // Mostrar indicador de carga
    this.addSystemMessage('Procesando tu pregunta...');
    
    // Configurar timeout para respuesta lenta
    this.responseTimeout = setTimeout(() => {
      this.addSystemMessage('El servidor está tardando en responder...');
    }, this.config.responseTimeout);
    
    // Crear objeto de mensaje
    const messageData = {
      question: message,
      conversation_name: this.conversationName
    };
    
    // Enviar mensaje a través del WebSocket
    this.sendSocketMessage(messageData);
  }
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .chat-message {
    transition: all 0.3s ease;
  }
  
  #connectionStatus {
    transition: background-color 0.3s ease;
  }
`;
document.head.appendChild(style);

// Inicializar el widget cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.ChatWidget = new ChatWidget();
});

// Exportar para sistemas de módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatWidget;
}