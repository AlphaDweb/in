import fetch from 'node-fetch';

const API_KEY = 'AIzaSyD7UKqYnZeY5PD2CthuzrJJPJOeXJwTsLc';

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        console.log('V1BETA MODELS:');
        if (data.models) {
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log(data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
