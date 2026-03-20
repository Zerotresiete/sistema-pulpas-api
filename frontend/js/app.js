// =============================================
// CONFIGURACIÓN
// =============================================
const API_URL = 'http://192.168.100.21:5000'; // Para pruebas locales

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alerta');
    if (!alerta) return;
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

async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const tbody = document.getElementById('tabla-productos');
        if (!tbody) return;
        
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
            
            const totalProd = document.getElementById('total-productos');
            if (totalProd) totalProd.textContent = data.total || data.productos.length;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos</td></tr>';
            const totalProd = document.getElementById('total-productos');
            if (totalProd) totalProd.textContent = '0';
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

async function cargarVentas() {
    try {
        const response = await fetch(`${API_URL}/ventas`);
        const ventas = await response.json();
        const tbody = document.getElementById('tabla-ventas');
        if (!tbody) return;
        
        if (ventas.length > 0) {
            tbody.innerHTML = ventas.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td>${formatearFecha(v.fecha)}</td>
                    <td>${v.cliente}</td>
                    <td>${formatearMoneda(v.total)}</td>
                    <td><span class="badge bg-${v.estado_pago === 'pagado' ? 'success' : 'warning'}">${v.estado_pago}</span></td>
                    <td>${formatearFecha(v.fecha_pactada)}</td>
                    <td><button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
            
            const pendientes = ventas.filter(v => v.estado_pago === 'pendiente');
            const pendientesEl = document.getElementById('ventas-pendientes');
            if (pendientesEl) pendientesEl.textContent = pendientes.length;
            
            const totalCobrar = pendientes.reduce((sum, v) => sum + v.total, 0);
            const totalCobrarEl = document.getElementById('total-cobrar');
            if (totalCobrarEl) totalCobrarEl.textContent = formatearMoneda(totalCobrar);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay ventas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/terceros?tipo=cliente`);
        const data = await response.json();
        const tbody = document.getElementById('tabla-clientes');
        if (!tbody) return;
        
        const clientes = data.terceros || data;
        if (clientes.length > 0) {
            tbody.innerHTML = clientes.map(c => `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${c.telefono || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.forma_pago || '-'}</td>
                    <td><button class="btn btn-sm btn-warning"><i class="fas fa-edit"></i></button></td>
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
            mostrarAlerta('✅ Producto creado exitosamente', 'success');
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
    const fechaEl = document.getElementById('fecha-actual');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-EC', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    
    cargarProductos();
    cargarVentas();
    cargarClientes();
    
    setInterval(() => {
        cargarProductos();
        cargarVentas();
        cargarClientes();
    }, 300000);
});
