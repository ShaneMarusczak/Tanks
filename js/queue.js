/**
 * A simple queue data structure (FIFO).
 * Used for BFS pathfinding and event queuing.
 */
class Queue {
    constructor() {
        this.elements = [];
    }

    /**
     * Adds an element to the end of the queue.
     * @param {*} element - The element to add
     */
    enqueue(element) {
        this.elements.push(element);
    }

    /**
     * Removes and returns the first element from the queue.
     * @returns {*} The first element, or undefined if empty
     */
    dequeue() {
        return this.elements.shift();
    }

    /**
     * Checks if the queue is empty.
     * @returns {boolean} True if empty, false otherwise
     */
    isEmpty() {
        return this.elements.length === 0;
    }

    /**
     * Removes all elements from the queue.
     */
    empty() {
        this.elements.length = 0;
    }

    /**
     * Returns the number of elements in the queue.
     * @returns {number} The queue length
     */
    get length() {
        return this.elements.length;
    }
}
