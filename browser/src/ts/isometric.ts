// These are the four numbers that define the transform, i hat and j hat
const i_x = 1;
const i_y = 0.5;
const j_x = -1;
const j_y = 0.5;

// Sprite size
const w = 1;
const h = 1;

export function to_screen_coordinate(tileX:number, tileY:number) {
  // Without accounting for sprite size
  /*return {
    x: tileX * i_x + tileY * j_x,
    y: tileX * i_y + tileY * j_y,
  }*/

  // Accounting for sprite size
  return {
    x: tileX * i_x * 0.5 * w + tileY * j_x * 0.5 * w,
    y: tileX * i_y * 0.5 * h + tileY * j_y * 0.5 * h,
  }
}

// Going from screen coordinate to grid coordinate

function invert_matrix(a:number, b:number, c:number, d:number) {
  // Determinant 
  const det = (1 / (a * d - b * c));
  
  return {
    a: det * d,
    b: det * -b,
    c: det * -c,
    d: det * a,
  }
}

export function to_grid_coordinate(screenX:number, screenY:number) {
  const a = i_x * 0.5 * w;
  const b = j_x * 0.5 * w;
  const c = i_y * 0.5 * h;
  const d = j_y * 0.5 * h;
  
  const inv = invert_matrix(a, b, c, d);
  
  return {
    x: screenX * inv.a + screenY * inv.b,
    y: screenX * inv.c + screenY * inv.d,
  }
}