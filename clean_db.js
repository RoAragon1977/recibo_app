const Database = require("better-sqlite3");
const db = new Database("recibos.db");

// Desactivar FK temporalmente
db.exec("PRAGMA foreign_keys = OFF");

// 1. Ver cuántas compras hay que borrar (junio 2026 en adelante)
const beforeDelete = db.prepare("SELECT COUNT(*) as cnt FROM Compra WHERE fecha >= '01/06/2026'").get();
console.log("Compras a borrar (desde 01/06/2026):", beforeDelete.cnt);

// 2. Borrarlas (primero CompraDetalle por FK, luego Compra)
db.exec("DELETE FROM CompraDetalle WHERE compra_id IN (SELECT id FROM Compra WHERE fecha >= '01/06/2026')");
db.exec("DELETE FROM Compra WHERE fecha >= '01/06/2026'");
console.log("Borradas successfully");

// 3. Verificar qué queda: último ID y fecha
const afterDelete = db.prepare("SELECT MAX(id) as maxId, fecha FROM Compra ORDER BY id DESC LIMIT 1").get();
console.log("Última compra después de borrar:", {id: afterDelete.maxId, fecha: afterDelete.fecha});

// 4. Reiniciar el contador autoincrementable de SQLite
db.exec("UPDATE sqlite_sequence SET seq = 2299 WHERE name = 'Compra'");

// 5. Verificar que el próximo insert dé ID 2300
const test = db.prepare("INSERT INTO Compra (proveedor_id, fecha, total_general) VALUES (?, ?, ?)");
const row = test.run(1, "29/05/2026", 100);
console.log("ID insertado (debe ser 2300):", row.lastInsertRowid);

// 6. Limpiar el registro insertado para dejar la BD limpia
db.exec("DELETE FROM Compra WHERE id = 2300");

// 7. Reactivar FK
db.exec("PRAGMA foreign_keys = ON");

// 7. Ver final
const finalCheck = db.prepare("SELECT MAX(id) as maxId FROM Compra").get();
console.log("Nuevo MAX ID:", finalCheck.maxId);
console.log("Última compra:", finalCheck ? "ID " + finalCheck.maxId + " (debe ser 2299 si no hay otras)" : "tabla vacía");
