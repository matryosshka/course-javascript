export default class WSClient {
  constructor(url, onMessage) {
    this.url = url;
    this.onMessage = onMessage;
  }

  connect() {
    // коннектимся к серверу
    return new Promise((resolve) => {
      this.socket = new WebSocket(this.url); // создаем веб-сокет
      this.socket.addEventListener('open', resolve); // ждем, пока он выдаст сообщение open
      this.socket.addEventListener('message', (e) => {
        this.onMessage(JSON.parse(e.data)); // когда по WS приходят сообщения: вызываем метод onMessage (стр.2), который передадим
        // в конструкторе --> megaChat.js
      });
    });
  }

  sendHello(name) {
    this.sendMessage('hello', { name }); // когда заходим в чат, отправляем серверу сообщение с типом: hello и именем
    // чтобы сервер понял, что мы к нему вошли и разослал это сообщение другим клиентам: { name } вошел в чат и в
    // список чата добавляется новый элемент
  }

  sendTextMessage(message) {
    // вызываем, когда хотим отправить текстовое сообщение
    this.sendMessage('text-message', { message }); // 'text-message' - тип ; { message } - содержимое сообщения
  }

  sendMessage(type, data) {
    //универсальный тип sendMessage - когда вызываем, должны передать тип сообщения и данные
    this.socket.send(
      JSON.stringify({
        // далее стрингифай (по вебсокету можем передавать только строки /и двоичные данные/)
        type,
        data,
      })
    );
  }
}
