export default class UserName {
  constructor(element) {
    this.element = element; // запоминаем элемент, с которым работаем
  }

  set(name) {
    // когда делаем set
    this.name = name; // запоминаем имя пользователя
    this.element.textContent = name; // и обновляем textContent элемента с именем пользвателя в main-чате
  }

  get() {
    return this.name;
  }
}
