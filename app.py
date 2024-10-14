from flask import Flask, request, jsonify, render_template
import numpy as np
import nltk
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import os

# Download necessary NLTK data
nltk.download('stopwords')
from nltk.corpus import stopwords

# Initialize Flask app
app = Flask(__name__)

# Load dataset and preprocess
dataset = fetch_20newsgroups(subset='all')
corpus = dataset.data
stop_words = stopwords.words('english')

# TF-IDF Vectorization with better preprocessing
tfidf_vectorizer = TfidfVectorizer(stop_words=stop_words, max_features=10000, use_idf=True, smooth_idf=True)
tfidf_matrix = tfidf_vectorizer.fit_transform(corpus)

# Apply SVD for dimensionality reduction
n_components = int(os.getenv('SVD_COMPONENTS', 110))  # Increased number of components for better accuracy
if n_components > tfidf_matrix.shape[1]:
    raise ValueError("n_components must be less than or equal to the number of features ({}).".format(tfidf_matrix.shape[1]))
svd = TruncatedSVD(n_components=n_components)
lsa_matrix = svd.fit_transform(tfidf_matrix)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    query = request.form['query']
    if not query.strip():
        return jsonify({'error': 'Query cannot be empty'}), 400

    query_vec = process_query(query)
    similarities = cosine_similarity(query_vec, lsa_matrix)
    num_results = min(5, len(corpus))  # Handle cases where there are fewer than 5 documents
    top_indices = np.argpartition(similarities[0], -num_results)[-num_results:]  # Get indices of the top documents
    top_indices = top_indices[np.argsort(similarities[0, top_indices])[::-1]]  # Sort the top indices by similarity

    results = []
    for idx in top_indices:
        result = {
            'title': f"Document {idx + 1}",
            'snippet': corpus[idx][:700],  # Show the first 200 characters as a snippet
            'similarity': float(similarities[0, idx])
        }
        results.append(result)

    return jsonify(results)

def process_query(query):
    """
    Process the user query and transform it into the LSA-reduced space.
    """
    query_tfidf = tfidf_vectorizer.transform([query])
    query_lsa = svd.transform(query_tfidf)
    return query_lsa

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3000, debug=True)