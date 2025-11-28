import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageConverterService {

  private http = inject(HttpClient);

  // Convertir une URL d'image en base64
  async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      // Si c'est déjà une data URL, on la retourne directement
      if (imageUrl.startsWith('data:')) {
        return imageUrl;
      }

      // Si c'est une URL absolue, on fait une requête HTTP
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur conversion image:', error);
      return ''; // Retourner une chaîne vide en cas d'erreur
    }
  }

  // Méthode pour les images locales (assets)
  async localImageToBase64(imagePath: string): Promise<string> {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur conversion image locale:', error);
      return '';
    }
  }

  // Vérifier si une URL est valide
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    if (url.startsWith('data:')) return true;
    if (url.startsWith('http://') || url.startsWith('https://')) return true;
    if (url.startsWith('assets/')) return true;
    return false;
  }
}
