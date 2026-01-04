/**
 * Represents a game event (movement or firing action).
 */
class GameEvent {
    /**
     * @param {string} type - The event type ('move' or 'fire')
     * @param {string} description - The event description (direction or target)
     */
    constructor(type, description) {
        this.type = type;
        this.description = description;
    }
}
