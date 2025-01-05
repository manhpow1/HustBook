class Post {
    static MAX_IMAGES = 4;
    static ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    constructor({
        postId = null,
        userId,
        content,
        images = [],
        likes = 0,
        comments = 0,
        createdAt = new Date(),
        updatedAt = null,
    }) {
        if (!userId) throw new Error('userId is required');
        if (!content) throw new Error('content is required');
        if (!Array.isArray(images)) throw new Error('images must be an array');
        if (images.length > Post.MAX_IMAGES) throw new Error(`Maximum ${Post.MAX_IMAGES} images allowed`);

        this.postId = postId;
        this.userId = userId;
        this.content = content;
        this.images = images;
        this.likes = likes;
        this.comments = comments;
        this.createdAt = new Date(createdAt);
        this.updatedAt = updatedAt ? new Date(updatedAt) : null;
        this.status = 'active';
    }

    validate() {
        if (!this.content || this.content.length < 1 || this.content.length > 1000) {
            throw new Error('Content length must be between 1 and 1000 characters');
        }
        if (this.images && this.images.length > this.MAX_IMAGES) {
            throw new Error(`Maximum ${this.MAX_IMAGES} images allowed`);
        }
        return true;
    }

    toJSON() {
        return {
            postId: this.postId,
            userId: this.userId,
            content: this.content,
            images: this.images,
            likes: this.likes,
            comments: this.comments,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            status: this.status,
        };
    }

    static validateForDeletion(post) {
        if (!post) return false;
        if (post.status === 'deleted') return false;
        if (post.status === 'locked') return false;
        return true;
    }
}

export default Post;