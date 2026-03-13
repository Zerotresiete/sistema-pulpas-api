from flask import Flask, jsonify, request
from supabase import create_client, Client
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime
import uuid

# =============================================
# CONFIGURACIÓN INICIAL
# =============================================

load_dotenv()  # Cargar variables de entorno

app = Flask(__name__)
CORS(app)  # Habilitar CORS para todos los dominios

# Configuración desde variables de entorno
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("❌ ERROR: No se encontraron las variables SUPABASE_URL y SUPABASE_KEY")
    print("Crea un archivo .env con esos valores")
    exit(1)

supabase: Client = create_client(url, key)

# =============================================
# FUNCIONES AUXILIARES
# =============================================

def generar_codigo_lote(tipo, producto_id):
    """Genera un código de lote único: TIPO-AAAAMMDD-XXX"""
    fecha = datetime.now().strftime("%Y%m%d")
    random_part = str(uuid.uuid4())[:4].upper()
    return f"{tipo}-{fecha}-{random_part}"

def manejar_error(e, mensaje="Error en la operación"):
    """Manejo uniforme de errores"""
    print(f"❌ {mensaje}: {str(e)}")
    return jsonify({
        "error": mensaje,
        "detalle": str(e),
        "tipo": type(e).__name__
    }), 500

# =============================================
# RUTAS DE PRUEBA Y DIAGNÓSTICO
# =============================================

@app.route('/')
def home():
    return jsonify({
        "mensaje": "🐵 SISTEMA DE PULPAS API - VERSIÓN MEJORADA",
        "version": "2.0",
        "estado": "operacional",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "prueba": {
                "test": "GET /test-db",
                "estadisticas": "GET /estadisticas"
            },
            "productos": {
                "todos": "GET /productos",
                "uno": "GET /productos/<id>",
                "crear": "POST /productos",
                "actualizar": "PUT /productos/<id>",
                "eliminar": "DELETE /productos/<id>",
                "por_tipo": "GET /productos/tipo/<tipo>",
                "stock_bajo": "GET /productos/stock/bajo"
            },
            "terceros": {
                "todos": "GET /terceros",
                "crear": "POST /terceros",
                "por_tipo": "GET /terceros/tipo/<tipo>"
            },
            "compras": {
                "todos": "GET /compras",
                "crear": "POST /compras",
                "detalle": "GET /compras/<id>"
            },
            "ventas": {
                "todos": "GET /ventas",
                "crear": "POST /ventas",
                "detalle": "GET /ventas/<id>",
                "pendientes": "GET /ventas/pendientes"
            },
            "produccion": {
                "todos": "GET /produccion",
                "crear": "POST /produccion",
                "etapas": "GET /produccion/<id>/etapas"
            }
        }
    })

@app.route('/test-db')
def test_db():
    """Prueba de conexión a la base de datos"""
    try:
        # Probar conexión consultando una tabla
        response = supabase.table('productos').select("*").limit(1).execute()
        return jsonify({
            "conexion": "exitosa",
            "mensaje": "Base de datos conectada correctamente",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return manejar_error(e, "Error de conexión a la base de datos")

@app.route('/estadisticas')
def estadisticas():
    """Estadísticas generales del sistema"""
    try:
        stats = {}
        
        # Contar productos
        prod_count = supabase.table('productos').select("*", count="exact").execute()
        stats['total_productos'] = prod_count.count
        
        # Contar terceros
        terc_count = supabase.table('terceros').select("*", count="exact").execute()
        stats['total_terceros'] = terc_count.count
        
        # Contar compras
        comp_count = supabase.table('compras').select("*", count="exact").execute()
        stats['total_compras'] = comp_count.count
        
        # Contar ventas
        vent_count = supabase.table('ventas').select("*", count="exact").execute()
        stats['total_ventas'] = vent_count.count
        
        # Productos por tipo
        materias = supabase.table('productos').select("*").eq('tipo', 'materia_prima').execute()
        stats['materias_primas'] = len(materias.data)
        
        terminados = supabase.table('productos').select("*").eq('tipo', 'producto_terminado').execute()
        stats['productos_terminados'] = len(terminados.data)
        
        return jsonify({
            "estadisticas": stats,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return manejar_error(e, "Error obteniendo estadísticas")

# =============================================
# MÓDULO 1: PRODUCTOS (MEJORADO)
# =============================================

@app.route('/productos', methods=['GET'])
def get_productos():
    """Obtener todos los productos con filtros opcionales"""
    try:
        # Obtener parámetros de consulta
        tipo = request.args.get('tipo')
        limite = request.args.get('limite', default=100, type=int)
        
        query = supabase.table('productos').select("*")
        
        if tipo:
            query = query.eq('tipo', tipo)
        
        response = query.limit(limite).execute()
        
        return jsonify({
            "total": len(response.data),
            "productos": response.data
        })
    except Exception as e:
        return manejar_error(e, "Error obteniendo productos")

@app.route('/productos/<int:id>', methods=['GET'])
def get_producto(id):
    """Obtener un producto por ID"""
    try:
        response = supabase.table('productos').select("*").eq('id', id).execute()
        
        if response.data:
            return jsonify(response.data[0])
        
        return jsonify({"error": "Producto no encontrado"}), 404
    except Exception as e:
        return manejar_error(e, f"Error obteniendo producto {id}")

@app.route('/productos', methods=['POST'])
def create_producto():
    """Crear un nuevo producto con validaciones"""
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('codigo'):
            return jsonify({"error": "El código es requerido"}), 400
        
        if not data.get('nombre'):
            return jsonify({"error": "El nombre es requerido"}), 400
        
        # Verificar si el código ya existe
        existe = supabase.table('productos').select("*").eq('codigo', data['codigo']).execute()
        if existe.data:
            return jsonify({"error": f"Ya existe un producto con código {data['codigo']}"}), 400
        
        nuevo_producto = {
            "codigo": data['codigo'],
            "nombre": data['nombre'],
            "descripcion": data.get('descripcion'),
            "tipo": data.get('tipo', 'materia_prima'),
            "unidad_medida": data.get('unidad_medida', 'kg'),
            "stock_minimo": data.get('stock_minimo', 0)
        }
        
        response = supabase.table('productos').insert(nuevo_producto).execute()
        
        return jsonify({
            "mensaje": "Producto creado exitosamente",
            "producto": response.data[0]
        }), 201
    except Exception as e:
        return manejar_error(e, "Error creando producto")

@app.route('/productos/<int:id>', methods=['PUT'])
def update_producto(id):
    """Actualizar un producto existente"""
    try:
        data = request.get_json()
        
        # Verificar que el producto existe
        existe = supabase.table('productos').select("*").eq('id', id).execute()
        if not existe.data:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        # Actualizar solo los campos proporcionados
        response = supabase.table('productos').update(data).eq('id', id).execute()
        
        return jsonify({
            "mensaje": "Producto actualizado exitosamente",
            "producto": response.data[0]
        })
    except Exception as e:
        return manejar_error(e, f"Error actualizando producto {id}")

@app.route('/productos/<int:id>', methods=['DELETE'])
def delete_producto(id):
    """Eliminar un producto"""
    try:
        # Verificar que el producto existe
        existe = supabase.table('productos').select("*").eq('id', id).execute()
        if not existe.data:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        # Verificar que no tenga movimientos asociados (opcional)
        # (aquí podrías agregar validaciones)
        
        response = supabase.table('productos').delete().eq('id', id).execute()
        
        return jsonify({
            "mensaje": "Producto eliminado exitosamente"
        })
    except Exception as e:
        return manejar_error(e, f"Error eliminando producto {id}")

@app.route('/productos/stock/bajo', methods=['GET'])
def productos_stock_bajo():
    """Obtener productos con stock bajo (stock <= stock_minimo)"""
    try:
        # Esta es una consulta más compleja que requiere una tabla de inventario
        # Por ahora devolvemos un mensaje
        return jsonify({
            "mensaje": "Funcionalidad en desarrollo",
            "nota": "Requiere tabla de inventario con stock actual"
        })
    except Exception as e:
        return manejar_error(e, "Error obteniendo productos con stock bajo")

# =============================================
# MÓDULO 2: TERCEROS (MEJORADO)
# =============================================

@app.route('/terceros', methods=['GET'])
def get_terceros():
    """Obtener todos los terceros con filtros"""
    try:
        tipo = request.args.get('tipo')
        
        query = supabase.table('terceros').select("*")
        
        if tipo:
            query = query.eq('tipo', tipo)
        
        response = query.execute()
        
        return jsonify({
            "total": len(response.data),
            "terceros": response.data
        })
    except Exception as e:
        return manejar_error(e, "Error obteniendo terceros")

@app.route('/terceros', methods=['POST'])
def create_tercero():
    """Crear un nuevo tercero"""
    try:
        data = request.get_json()
        
        if not data.get('nombre'):
            return jsonify({"error": "El nombre es requerido"}), 400
        
        nuevo_tercero = {
            "nombre": data['nombre'],
            "tipo": data.get('tipo', 'cliente'),
            "contacto": data.get('contacto'),
            "telefono": data.get('telefono'),
            "direccion": data.get('direccion'),
            "email": data.get('email'),
            "forma_pago": data.get('forma_pago')
        }
        
        response = supabase.table('terceros').insert(nuevo_tercero).execute()
        
        return jsonify({
            "mensaje": "Tercero creado exitosamente",
            "tercero": response.data[0]
        }), 201
    except Exception as e:
        return manejar_error(e, "Error creando tercero")

@app.route('/terceros/tipo/<string:tipo>', methods=['GET'])
def get_terceros_por_tipo(tipo):
    """Obtener terceros filtrados por tipo"""
    try:
        response = supabase.table('terceros').select("*").eq('tipo', tipo).execute()
        return jsonify(response.data)
    except Exception as e:
        return manejar_error(e, f"Error obteniendo terceros tipo {tipo}")

# =============================================
# MÓDULO 3: COMPRAS (MEJORADO)
# =============================================

@app.route('/compras', methods=['GET'])
def get_compras():
    """Obtener todas las compras"""
    try:
        response = supabase.table('compras').select("*, proveedor:terceros(*)").execute()
        
        # Formatear la respuesta
        compras = []
        for compra in response.data:
            compra_formateada = {
                "id": compra['id'],
                "fecha": compra['fecha_compra'],
                "proveedor": compra['proveedor']['nombre'] if compra['proveedor'] else "N/A",
                "total": compra['total'],
                "estado": compra['estado'],
                "forma_pago": compra['forma_pago']
            }
            compras.append(compra_formateada)
        
        return jsonify(compras)
    except Exception as e:
        return manejar_error(e, "Error obteniendo compras")

@app.route('/compras/<int:id>', methods=['GET'])
def get_compra_detalle(id):
    """Obtener detalle de una compra específica"""
    try:
        response = supabase.table('compras').select("*, proveedor:terceros(*)").eq('id', id).execute()
        
        if response.data:
            return jsonify(response.data[0])
        
        return jsonify({"error": "Compra no encontrada"}), 404
    except Exception as e:
        return manejar_error(e, f"Error obteniendo compra {id}")

@app.route('/compras', methods=['POST'])
def create_compra():
    """Crear una nueva compra"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('proveedor_id'):
            return jsonify({"error": "El proveedor es requerido"}), 400
        
        nueva_compra = {
            "proveedor_id": data['proveedor_id'],
            "fecha_compra": data.get('fecha_compra', datetime.now().strftime("%Y-%m-%d")),
            "fecha_entrega": data.get('fecha_entrega'),
            "estado": data.get('estado', 'pendiente'),
            "total": data.get('total', 0),
            "forma_pago": data.get('forma_pago'),
            "observaciones": data.get('observaciones')
        }
        
        response = supabase.table('compras').insert(nueva_compra).execute()
        
        return jsonify({
            "mensaje": "Compra creada exitosamente",
            "compra": response.data[0]
        }), 201
    except Exception as e:
        return manejar_error(e, "Error creando compra")

# =============================================
# MÓDULO 4: VENTAS (MEJORADO)
# =============================================

@app.route('/ventas', methods=['GET'])
def get_ventas():
    """Obtener todas las ventas"""
    try:
        response = supabase.table('ventas').select("*, cliente:terceros(*)").execute()
        
        # Formatear la respuesta
        ventas = []
        for venta in response.data:
            venta_formateada = {
                "id": venta['id'],
                "fecha": venta['fecha_venta'],
                "cliente": venta['cliente']['nombre'] if venta['cliente'] else "N/A",
                "total": venta['total'],
                "estado_pago": venta['estado_pago'],
                "fecha_pactada": venta['fecha_pactada_pago']
            }
            ventas.append(venta_formateada)
        
        return jsonify(ventas)
    except Exception as e:
        return manejar_error(e, "Error obteniendo ventas")

@app.route('/ventas/<int:id>', methods=['GET'])
def get_venta_detalle(id):
    """Obtener detalle de una venta específica"""
    try:
        response = supabase.table('ventas').select("*, cliente:terceros(*)").eq('id', id).execute()
        
        if response.data:
            return jsonify(response.data[0])
        
        return jsonify({"error": "Venta no encontrada"}), 404
    except Exception as e:
        return manejar_error(e, f"Error obteniendo venta {id}")

@app.route('/ventas', methods=['POST'])
def create_venta():
    """Crear una nueva venta"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('cliente_id'):
            return jsonify({"error": "El cliente es requerido"}), 400
        
        nueva_venta = {
            "cliente_id": data['cliente_id'],
            "fecha_venta": data.get('fecha_venta', datetime.now().strftime("%Y-%m-%d")),
            "fecha_pactada_pago": data.get('fecha_pactada_pago'),
            "estado_pago": data.get('estado_pago', 'pendiente'),
            "total": data.get('total', 0),
            "observaciones": data.get('observaciones')
        }
        
        response = supabase.table('ventas').insert(nueva_venta).execute()
        
        return jsonify({
            "mensaje": "Venta creada exitosamente",
            "venta": response.data[0]
        }), 201
    except Exception as e:
        return manejar_error(e, "Error creando venta")

@app.route('/ventas/pendientes', methods=['GET'])
def ventas_pendientes():
    """Obtener ventas con pago pendiente"""
    try:
        response = supabase.table('ventas').select("*, cliente:terceros(*)").eq('estado_pago', 'pendiente').execute()
        
        total_pendiente = sum(venta['total'] for venta in response.data)
        
        return jsonify({
            "total_pendiente": total_pendiente,
            "cantidad_ventas": len(response.data),
            "ventas": response.data
        })
    except Exception as e:
        return manejar_error(e, "Error obteniendo ventas pendientes")

# =============================================
# MÓDULO 5: PRODUCCIÓN (MEJORADO)
# =============================================

@app.route('/produccion', methods=['GET'])
def get_produccion():
    """Obtener órdenes de producción"""
    try:
        response = supabase.table('ordenes_produccion').select("*, producto:productos(*)").execute()
        return jsonify(response.data)
    except Exception as e:
        return manejar_error(e, "Error obteniendo órdenes de producción")

@app.route('/produccion', methods=['POST'])
def create_orden_produccion():
    """Crear una nueva orden de producción"""
    try:
        data = request.get_json()
        
        if not data.get('producto_id'):
            return jsonify({"error": "El producto es requerido"}), 400
        
        nueva_orden = {
            "lote_codigo": generar_codigo_lote("PROD", data['producto_id']),
            "producto_id": data['producto_id'],
            "cantidad_objetivo": data.get('cantidad_objetivo', 0),
            "fecha_inicio": data.get('fecha_inicio', datetime.now().strftime("%Y-%m-%d")),
            "estado": data.get('estado', 'planeada'),
            "observaciones": data.get('observaciones')
        }
        
        response = supabase.table('ordenes_produccion').insert(nueva_orden).execute()
        
        return jsonify({
            "mensaje": "Orden de producción creada exitosamente",
            "orden": response.data[0]
        }), 201
    except Exception as e:
        return manejar_error(e, "Error creando orden de producción")

@app.route('/produccion/<int:id>/etapas', methods=['GET'])
def get_etapas_produccion(id):
    """Obtener etapas de una orden de producción"""
    try:
        # Esto requeriría una tabla 'etapas_produccion'
        return jsonify({
            "mensaje": "Funcionalidad en desarrollo",
            "orden_id": id
        })
    except Exception as e:
        return manejar_error(e, f"Error obteniendo etapas de producción {id}")

# =============================================
# INICIO DEL SERVIDOR
# =============================================

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🐵 SISTEMA DE PULPAS API - VERSIÓN MEJORADA")
    print("="*50)
    print(f"📡 Supabase URL: {url[:30]}...")
    print(f"✅ Conexión a Supabase: Establecida")
    print(f"🚀 Flask iniciado en http://127.0.0.1:5000")
    print("="*50)
    print("\n📋 ENDPOINTS DISPONIBLES:")
    print("   🌐 GET  /                - Información general")
    print("   🔌 GET  /test-db          - Probar conexión BD")
    print("   📊 GET  /estadisticas     - Estadísticas del sistema")
    print("\n   📦 PRODUCTOS:")
    print("      GET    /productos")
    print("      POST   /productos")
    print("      GET    /productos/<id>")
    print("      PUT    /productos/<id>")
    print("      DELETE /productos/<id>")
    print("      GET    /productos/tipo/<tipo>")
    print("\n   👥 TERCEROS:")
    print("      GET    /terceros")
    print("      POST   /terceros")
    print("      GET    /terceros/tipo/<tipo>")
    print("\n   🛒 COMPRAS:")
    print("      GET    /compras")
    print("      POST   /compras")
    print("      GET    /compras/<id>")
    print("\n   💰 VENTAS:")
    print("      GET    /ventas")
    print("      POST   /ventas")
    print("      GET    /ventas/<id>")
    print("      GET    /ventas/pendientes")
    print("\n   🏭 PRODUCCIÓN:")
    print("      GET    /produccion")
    print("      POST   /produccion")
    print("="*50 + "\n")
    
   # =============================================
# INICIO DEL SERVIDOR - VERSIÓN PARA RAILWAY
# =============================================

if __name__ == '__main__':
    # Puerto para Railway (lo asigna automáticamente)
    port = int(os.environ.get('PORT', 5000))
    print(f"🐵 Iniciando servidor en puerto {port}")
    print(f"📡 Variables de entorno cargadas: {bool(os.getenv('SUPABASE_URL'))}")
    app.run(host='0.0.0.0', port=port, debug=False)
