function Queue() {
    this.queue = [];
    this.busy = false;
}

Queue.prototype.enqueue = function () {
    var args = arguments,
        self = this;

    this.queue.push(function () {
        self.exec.apply(self, args);
    });

    if (this.canProceed() && !this.busy) {
        this.next();
    }
};

Queue.prototype.next = function () {
    if (this.busy) return;
    var next = this.queue.shift();

    if (next) {
        this.busy = true;
        next();
    }
};

Queue.prototype.exec = function () {throw new Error('abstract method exec not reimplemented');};
Queue.prototype.canProceed = function () { return true; };
Queue.prototype.done = function () {
    this.busy = false;
    this.next();
};

module.exports = Queue;
