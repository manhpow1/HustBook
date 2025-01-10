class Post {
    static MAX_IMAGES = 4;
    static ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    constructor({
        postId = null,
        userId,
        content,
        contentLowerCase = [],
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
        this.contentLowerCase = contentLowerCase;
        this.images = images;
        this.likes = likes;
        this.comments = comments;
        this.createdAt = new Date(createdAt);
        this.updatedAt = updatedAt ? new Date(updatedAt) : null;
        this.status = 'active';
    }

    validate() {
        // Content validation
        if (!this.content || typeof this.content !== 'string') {
            throw new Error('Content must be a string');
        }
        
        const trimmedContent = this.content.trim();
        if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
            throw new Error('Content length must be between 1 and 1000 characters');
        }

        // Images validation
        if (!Array.isArray(this.images)) {
            throw new Error('Images must be an array');
        }

        if (this.images.length > Post.MAX_IMAGES) {
            throw new Error(`Maximum ${Post.MAX_IMAGES} images allowed`);
        }

        // Validate each image URL
        this.images.forEach((url, index) => {
            if (typeof url !== 'string' || !url.trim()) {
                throw new Error(`Invalid image URL at index ${index}`);
            }
            try {
                new URL(url);
            } catch (e) {
                throw new Error(`Invalid image URL format at index ${index}`);
            }
        });

        // Validate dates
        if (!(this.createdAt instanceof Date) || isNaN(this.createdAt)) {
            throw new Error('Invalid createdAt date');
        }

        if (this.updatedAt !== null && (!(this.updatedAt instanceof Date) || isNaN(this.updatedAt))) {
            throw new Error('Invalid updatedAt date');
        }

        return true;
    }

    toJSON() {
        return {
            postId: this.postId,
            userId: this.userId,
            content: this.content,
            contentLowerCase: this.contentLowerCase,
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
