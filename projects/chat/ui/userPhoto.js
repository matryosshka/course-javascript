export default class UserPhoto {
  constructor(element, onUpload) {
    this.element = element; // запоминаем элемент, для которого создаем UserPhoto
    this.onUpload = onUpload;

    this.element.addEventListener('dragover', (e) => {
      // событие, когда над элементом что-то проносят
      if (e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file') {
        e.preventDefault();
      }
    });

    this.element.addEventListener('drop', (e) => {
      const file = e.dataTransfer.items[0].getAsFile(); // при дропе - прочитай, то что мы тебе притащили, как файл
      const reader = new FileReader(); // и создай файл-ридер

      reader.readAsDataURL(file); // прочитай это файл ридером, чтобы получился дата-урл (картинка в base-64)
      reader.addEventListener('load', () => this.onUpload(reader.result)); // когда преобразование закончено, вызываем onUpload
      // т.е: получаем функцию, которую нужно вызвать, когда произойдет событие и вызываем эту функцию, при наступлении события
      e.preventDefault();
    });
  }

  set(photo) {
    // set - меняет бэкгрунд на то, что ему передаем
    this.element.style.backgroundImage = `url(${photo})`;
  }
}
