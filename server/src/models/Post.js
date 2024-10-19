class Post {
    constructor({ id = null, userId, content, images = [], likes = 0, comments = 0, createdAt = new Date(), updatedAt = null }) {
        this.id = id;
        this.userId = userId;
        this.content = content;
        this.images = images;
        this.likes = likes;
        this.comments = comments;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            content: this.content,
            images: this.images,
            likes: this.likes,
            comments: this.comments,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Post;
