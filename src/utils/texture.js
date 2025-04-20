import { TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace } from "three";
export function loadTexture(url) {
  const texture = new TextureLoader().load(url);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
