import { db } from "../database/init.ts";
import { v4 as uuidv4 } from "uuid";
import moment from "moment-timezone";

export interface WebhookData {
  id?: string;
  event_type: string;
  company_id?: string;
  payload: string | object;
  headers: string | object;
  signature?: string;
  is_valid_signature?: boolean;
  received_at?: string;
  response_status?: number;
  processing_time_ms?: number;
  source_ip?: string;
  user_agent?: string;
}

export interface WebhookFilter {
  event_type?: string;
  company_id?: string;
  date_from?: string;
  date_to?: string;
  is_valid_signature?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

export class WebhookModel {
  
  // Créer un nouveau webhook
  static create(data: WebhookData): string {
    const id = uuidv4();
    const now = moment().tz('Africa/Douala').format();
    
    const stmt = db.prepare(`
      INSERT INTO webhooks (
        id, event_type, company_id, payload, headers, signature, 
        is_valid_signature, received_at, response_status, 
        processing_time_ms, source_ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      data.event_type,
      data.company_id || null,
      typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload,
      typeof data.headers === 'object' ? JSON.stringify(data.headers) : data.headers,
      data.signature || null,
      data.is_valid_signature ? 1 : 0,
      data.received_at || now,
      data.response_status || 200,
      data.processing_time_ms || 0,
      data.source_ip || null,
      data.user_agent || null
    ]);
    
    return id;
  }
  
  // Récupérer tous les webhooks avec filtres
  static findAll(filter: WebhookFilter = {}): any[] {
    let query = `SELECT * FROM webhooks WHERE 1=1`;
    const params: any[] = [];
    
    if (filter.event_type) {
      query += ` AND event_type = ?`;
      params.push(filter.event_type);
    }
    
    if (filter.company_id) {
      query += ` AND company_id = ?`;
      params.push(filter.company_id);
    }
    
    if (filter.date_from) {
      query += ` AND received_at >= ?`;
      params.push(filter.date_from);
    }
    
    if (filter.date_to) {
      query += ` AND received_at <= ?`;
      params.push(filter.date_to);
    }
    
    if (filter.is_valid_signature !== undefined) {
      query += ` AND is_valid_signature = ?`;
      params.push(filter.is_valid_signature ? 1 : 0);
    }
    
    if (filter.search) {
      query += ` AND (payload LIKE ? OR event_type LIKE ?)`;
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    
    query += ` ORDER BY received_at DESC`;
    
    if (filter.limit) {
      query += ` LIMIT ?`;
      params.push(filter.limit);
      
      if (filter.offset) {
        query += ` OFFSET ?`;
        params.push(filter.offset);
      }
    }
    
    const stmt = db.prepare(query);
    const results = stmt.all(params);
    
    // Parser les JSON strings
    return results.map((row: any) => ({
      ...row,
      payload: JSON.parse(row.payload),
      headers: JSON.parse(row.headers),
      is_valid_signature: !!row.is_valid_signature
    }));
  }
  
  // Récupérer un webhook par ID
  static findById(id: string): any | null {
    const stmt = db.prepare("SELECT * FROM webhooks WHERE id = ?");
    const result = stmt.get(id);
    
    if (!result) return null;
    
    return {
      ...result,
      payload: JSON.parse(result.payload),
      headers: JSON.parse(result.headers),
      is_valid_signature: !!result.is_valid_signature
    };
  }
  
  // Compter le nombre total de webhooks
  static count(filter: WebhookFilter = {}): number {
    let query = `SELECT COUNT(*) as count FROM webhooks WHERE 1=1`;
    const params: any[] = [];
    
    if (filter.event_type) {
      query += ` AND event_type = ?`;
      params.push(filter.event_type);
    }
    
    if (filter.company_id) {
      query += ` AND company_id = ?`;
      params.push(filter.company_id);
    }
    
    if (filter.date_from) {
      query += ` AND received_at >= ?`;
      params.push(filter.date_from);
    }
    
    if (filter.date_to) {
      query += ` AND received_at <= ?`;
      params.push(filter.date_to);
    }
    
    const stmt = db.prepare(query);
    const result = stmt.get(params) as any;
    
    return result.count;
  }
  
  // Supprimer les anciens webhooks
  static cleanOld(keepCount: number = 10000): number {
    const stmt = db.prepare(`
      DELETE FROM webhooks 
      WHERE id NOT IN (
        SELECT id FROM webhooks 
        ORDER BY received_at DESC 
        LIMIT ?
      )
    `);
    
    const result = stmt.run(keepCount);
    return result.changes;
  }
  
  // Obtenir les statistiques de base
  static getStats() {
    const totalStmt = db.prepare("SELECT COUNT(*) as count FROM webhooks");
    const total = totalStmt.get() as any;
    
    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count FROM webhooks 
      WHERE DATE(received_at) = DATE('now')
    `);
    const today = todayStmt.get() as any;
    
    const validStmt = db.prepare("SELECT COUNT(*) as count FROM webhooks WHERE is_valid_signature = 1");
    const valid = validStmt.get() as any;
    
    const eventsStmt = db.prepare(`
      SELECT event_type, COUNT(*) as count 
      FROM webhooks 
      GROUP BY event_type 
      ORDER BY count DESC 
      LIMIT 10
    `);
    const topEvents = eventsStmt.all();
    
    return {
      total: total.count,
      today: today.count,
      valid: valid.count,
      invalid: total.count - valid.count,
      topEvents
    };
  }
  
  // Obtenir l'historique par heure pour les 24 dernières heures
  static getHourlyStats() {
    const stmt = db.prepare(`
      SELECT 
        strftime('%H', received_at) as hour,
        COUNT(*) as count
      FROM webhooks 
      WHERE received_at >= datetime('now', '-24 hours')
      GROUP BY strftime('%H', received_at)
      ORDER BY hour
    `);
    
    return stmt.all();
  }
}