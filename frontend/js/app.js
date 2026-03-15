// =============================================
// CONFIGURACIÓN
// =============================================
const API_URL = 'https://web-production-4a4f03.up.railway.app'; // TU URL DE RAILWAY

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alerta');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
    
    setTimeout(() => {
        alerta.classList.add('d-none');
    }, 3000);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-EC');
}

function formatearMoneda(valor) {
    return `$${Number(valor).toLocaleString('es-EC')}`;
}

// =============================================
// FUNCIONES DE CARGA DE DATOS
// =============================================

// Cargar productos
async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        
        const tbody = document.getElementById('tabla-productos');
        
        if (data.productos && data.productos.length > 0) {
            tbody.innerHTML = data.productos.map(p => `
                <tr>
                    <td>${p.codigo}</td>
                    <td>${p.nombre}</td>
                    <td>${p.tipo.replace('_', ' ')}</td>
                    <td>${p.unidad_medida}</td>
                    <td>${p.stock_minimo}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editarProducto(${p.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            document.getElementById('total-productos').textContent = data.total || data.productos.length;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos</td></tr>';
            document.getElementById('total-productos').textContent = '0';
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarAlerta('Error cargando productos', 'danger');
    }
}

// Cargar ventas
async function cargarVentas() {
    try {
        const response = await fetch(`${API_URL}/ventas`);
        const ventas = await response.json();
        
        const tbody = document.getElementById('tabla-ventas');
        
        if (ventas.length > 0) {
            tbody.innerHTML = ventas.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td>${formatearFecha(v.fecha)}</td>
                    <td>${v.cliente}</td>
                    <td>${formatearMoneda(v.total)}</td>
                    <td>
                        <span class="badge bg-${v.estado_pago === 'pagado' ? 'success' : 'warning'}">
                            ${v.estado_pago}
                        </span>
                    </td>
                    <td>${formatearFecha(v.fecha_pactada)}</td>
                </tr>
            `).join('');
            
            // Calcular ventas pendientes
            const pendientes = ventas.filter(v => v.estado_pago === 'pendiente');
            document.getElementById('ventas-pendientes').textContent = pendientes.length;
            
            // Calcular total a cobrar
            const totalCobrar = pendientes.reduce((sum, v) => sum + v.total, 0);
            document.getElementById('total-cobrar').textContent = formatearMoneda(totalCobrar);
            
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay ventas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

// Cargar clientes
async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/terceros?tipo=cliente`);
        const data = await response.json();
        
        const tbody = document.getElementById('tabla-clientes');
        const clientes = data.terceros || data;
        
        if (clientes.length > 0) {
            tbody.innerHTML = clientes.map(c => `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${c.telefono || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.forma_pago || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editarCliente(${c.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay clientes</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================

// Guardar nuevo producto
async function guardarProducto() {
    const producto = {
        codigo: document.getElementById('productoCodigo').value,
        nombre: document.getElementById('productoNombre').value,
        tipo: document.getElementById('productoTipo').value,
        unidad_medida: document.getElementById('productoUnidad').value,
        stock_minimo: parseInt(document.getElementById('productoStockMinimo').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/productos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('Producto creado exitosamente', 'success');
            document.getElementById('formProducto').reset();
            bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
            cargarProductos();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al crear producto', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar fecha actual
    document.getElementById('fecha-actual').textContent = 
        new Date().toLocaleDateString('es-EC', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    
    // Cargar datos iniciales
    cargarProductos();
    cargarVentas();
    cargarClientes();
    
    // Actualizar cada 5 minutos
    setInterval(() => {
        cargarProductos();
        cargarVentas();
        cargarClientes();
    }, 300000);
});

