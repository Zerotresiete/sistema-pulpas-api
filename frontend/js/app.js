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
// EDITAR PRODUCTO
// =============================================
async function editarProducto(id) {
    console.log('Editando producto:', id);
    
    try {
        // Obtener datos del producto
        const response = await fetch(`${API_URL}/productos/${id}`);
        const producto = await response.json();
        
        // Llenar el formulario del modal
        document.getElementById('productoCodigo').value = producto.codigo;
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoTipo').value = producto.tipo;
        document.getElementById('productoUnidad').value = producto.unidad_medida;
        document.getElementById('productoStockMinimo').value = producto.stock_minimo;
        
        // Cambiar el título del modal
        document.querySelector('#modalProducto .modal-title').innerHTML = 
            '<i class="fas fa-edit me-2"></i>Editar Producto';
        
        // Cambiar función del botón Guardar
        document.querySelector('#modalProducto .btn-success').setAttribute('onclick', `actualizarProducto(${id})`);
        
        // Abrir modal
        new bootstrap.Modal(document.getElementById('modalProducto')).show();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar producto', 'danger');
    }
}

// =============================================
// ACTUALIZAR PRODUCTO
// =============================================
async function actualizarProducto(id) {
    console.log('Actualizando producto:', id);
    
    const producto = {
        codigo: document.getElementById('productoCodigo').value,
        nombre: document.getElementById('productoNombre').value,
        tipo: document.getElementById('productoTipo').value,
        unidad_medida: document.getElementById('productoUnidad').value,
        stock_minimo: parseInt(document.getElementById('productoStockMinimo').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto actualizado', 'success');
            
            // Resetear modal
            resetearModalProducto();
            
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
            
            // Recargar lista
            await cargarProductos();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al actualizar', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// =============================================
// ELIMINAR PRODUCTO
// =============================================
async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto eliminado', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('Error al eliminar', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// =============================================
// RESETEAR MODAL (para nuevo producto)
// =============================================
function resetearModalProducto() {
    document.getElementById('formProducto').reset();
    document.querySelector('#modalProducto .modal-title').innerHTML = 
        '<i class="fas fa-box me-2"></i>Nuevo Producto';
    document.querySelector('#modalProducto .btn-success').setAttribute('onclick', 'guardarProducto()');
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

// =============================================
// MÓDULO DE VENTAS - NUEVO
// =============================================

// Variables globales para ventas
let productosVenta = [];
let clientesLista = [];
let productosLista = [];

// Cargar clientes para el selector
async function cargarClientesSelector() {
    try {
        const response = await fetch(`${API_URL}/terceros?tipo=cliente`);
        const data = await response.json();
        clientesLista = data.terceros || data;
        
        const select = document.getElementById('ventaCliente');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione un cliente...</option>';
        
        clientesLista.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// Cargar productos para el selector
async function cargarProductosSelector() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        productosLista = data.productos || data;
        
        // Actualizar todos los selectores de productos
        document.querySelectorAll('.producto-select').forEach(select => {
            actualizarSelectorProducto(select);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Actualizar un selector de productos específico
function actualizarSelectorProducto(selectElement) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';
    
    productosLista.forEach(p => {
        selectElement.innerHTML += `<option value="${p.id}" 
            data-precio="${p.precio_sugerido || 5000}">${p.nombre} (${p.codigo})</option>`;
    });
    
    if (currentValue) selectElement.value = currentValue;
}

// Agregar nueva línea de producto
document.getElementById('agregarProducto')?.addEventListener('click', function() {
    const contenedor = document.getElementById('contenedor-productos');
    const nuevoProducto = document.querySelector('.producto-item').cloneNode(true);
    
    // Limpiar valores
    nuevoProducto.querySelector('.producto-select').value = '';
    nuevoProducto.querySelector('.producto-cantidad').value = '';
    nuevoProducto.querySelector('.producto-precio').value = '';
    
    // Mostrar botón eliminar
    nuevoProducto.querySelector('.eliminar-producto').style.display = 'block';
    
    // Agregar evento al botón eliminar
    nuevoProducto.querySelector('.eliminar-producto').addEventListener('click', function() {
        nuevoProducto.remove();
        calcularTotalVenta();
    });
    
    // Agregar eventos a los campos
    nuevoProducto.querySelector('.producto-select').addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const precio = selected.dataset.precio || 5000;
        const fila = this.closest('.producto-item');
        fila.querySelector('.producto-precio').value = precio;
        calcularTotalVenta();
    });
    
    nuevoProducto.querySelector('.producto-cantidad').addEventListener('input', calcularTotalVenta);
    nuevoProducto.querySelector('.producto-precio').addEventListener('input', calcularTotalVenta);
    
    // Actualizar selector con productos disponibles
    actualizarSelectorProducto(nuevoProducto.querySelector('.producto-select'));
    
    contenedor.appendChild(nuevoProducto);
});

// Calcular total de la venta
function calcularTotalVenta() {
    let total = 0;
    document.querySelectorAll('.producto-item').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.producto-cantidad').value) || 0;
        const precio = parseFloat(item.querySelector('.producto-precio').value) || 0;
        total += cantidad * precio;
    });
    const totalSpan = document.getElementById('ventaTotal');
    if (totalSpan) totalSpan.textContent = total.toLocaleString('es-EC');
    return total;
}

// Guardar venta
async function guardarVenta() {
    const clienteId = document.getElementById('ventaCliente')?.value;
    if (!clienteId) {
        mostrarAlerta('Debe seleccionar un cliente', 'warning');
        return;
    }
    
    // Recoger productos
    const productos = [];
    let valido = true;
    
    document.querySelectorAll('.producto-item').forEach(item => {
        const productoId = item.querySelector('.producto-select').value;
        const cantidad = parseFloat(item.querySelector('.producto-cantidad').value);
        const precio = parseFloat(item.querySelector('.producto-precio').value);
        
        if (productoId && cantidad > 0 && precio > 0) {
            productos.push({
                producto_id: parseInt(productoId),
                cantidad: cantidad,
                precio_unitario: precio
            });
        } else if (productoId || cantidad || precio) {
            valido = false;
        }
    });
    
    if (!valido) {
        mostrarAlerta('Complete correctamente todos los productos', 'warning');
        return;
    }
    
    if (productos.length === 0) {
        mostrarAlerta('Debe agregar al menos un producto', 'warning');
        return;
    }
    
    const venta = {
        cliente_id: parseInt(clienteId),
        fecha_pactada_pago: document.getElementById('ventaFechaPago')?.value || null,
        observaciones: document.getElementById('ventaObservaciones')?.value || '',
        estado_pago: 'pendiente',
        productos: productos
    };
    
    try {
        const response = await fetch(`${API_URL}/ventas/detalle`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(venta)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Venta guardada exitosamente', 'success');
            
            // Resetear formulario
            document.getElementById('formVenta')?.reset();
            
            // Reiniciar contenedor de productos (dejar solo uno)
            const contenedor = document.getElementById('contenedor-productos');
            contenedor.innerHTML = `
                <div class="row mb-2 producto-item">
                    <div class="col-md-5">
                        <select class="form-control producto-select" required>
                            <option value="">Seleccionar producto...</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control producto-cantidad" 
                               placeholder="Cantidad" min="0.1" step="0.1" required>
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control producto-precio" 
                               placeholder="Precio unit." min="0" step="100" required>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-danger btn-sm eliminar-producto" style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalVenta'));
            if (modal) modal.hide();
            
            // Recargar ventas
            await cargarVentas();
            
            // Recargar selectores
            await cargarProductosSelector();
            
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al guardar venta', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// Ver detalle de una venta
async function verDetalleVenta(id) {
    try {
        const response = await fetch(`${API_URL}/ventas/${id}/detalle`);
        const data = await response.json();
        
        let mensaje = `VENTA #${id}\n`;
        mensaje += `Cliente: ${data.venta.cliente.nombre}\n`;
        mensaje += `Fecha: ${formatearFecha(data.venta.fecha_venta)}\n`;
        mensaje += `Estado: ${data.venta.estado_pago}\n`;
        mensaje += `Total: ${formatearMoneda(data.venta.total)}\n\n`;
        mensaje += `PRODUCTOS:\n`;
        
        data.detalles.forEach(d => {
            mensaje += `- ${d.producto.nombre}: ${d.cantidad} x $${d.precio_unitario} = $${d.subtotal}\n`;
        });
        
        alert(mensaje);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Inicializar eventos del modal de ventas
document.getElementById('modalVenta')?.addEventListener('show.bs.modal', async function() {
    await cargarClientesSelector();
    await cargarProductosSelector();
    
    // Agregar eventos a la primera fila
    const primeraFila = document.querySelector('.producto-item');
    if (primeraFila) {
        primeraFila.querySelector('.producto-select')?.addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const precio = selected.dataset.precio || 5000;
            const fila = this.closest('.producto-item');
            fila.querySelector('.producto-precio').value = precio;
            calcularTotalVenta();
        });
        
        primeraFila.querySelector('.producto-cantidad')?.addEventListener('input', calcularTotalVenta);
        primeraFila.querySelector('.producto-precio')?.addEventListener('input', calcularTotalVenta);
    }
});

// Modificar la función cargarVentas para incluir botón de detalle
// (Esta parte reemplaza la función cargarVentas existente)
// Busca la función cargarVentas en tu código y REEMPLÁZALA con esta:

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
                    <td>
                        <span class="badge bg-${v.estado_pago === 'pagado' ? 'success' : 'warning'}">
                            ${v.estado_pago}
                        </span>
                    </td>
                    <td>${formatearFecha(v.fecha_pactada)}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            const pendientes = ventas.filter(v => v.estado_pago === 'pendiente');
            document.getElementById('ventas-pendientes').textContent = pendientes.length;
            
            const totalCobrar = pendientes.reduce((sum, v) => sum + v.total, 0);
            document.getElementById('total-cobrar').textContent = formatearMoneda(totalCobrar);
            
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay ventas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}
